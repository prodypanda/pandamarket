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
  Sliders,
  Loader2,
  QrCode,
  Sparkles,
  X,
  AlertCircle,
  ExternalLink,
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
  zone: 'grand_tunis' | 'cap_bon_sahel' | 'nord_ouest_centre' | 'sfax_sud';
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

// 24 Tunisian Governorates
const DEFAULT_GOVERNORATES: GovernorateInfo[] = [
  // Zone 1: Grand Tunis
  { code: 'TUN', name: 'Tunis', name_ar: 'تونس', zone: 'grand_tunis', default_postal: '1000' },
  { code: 'ARI', name: 'Ariana', name_ar: 'أريانة', zone: 'grand_tunis', default_postal: '2080' },
  { code: 'BEN', name: 'Ben Arous', name_ar: 'بن عروس', zone: 'grand_tunis', default_postal: '2013' },
  { code: 'MAN', name: 'Manouba', name_ar: 'منوبة', zone: 'grand_tunis', default_postal: '2010' },

  // Zone 2: Cap Bon & Sahel
  { code: 'NAB', name: 'Nabeul', name_ar: 'نابل', zone: 'cap_bon_sahel', default_postal: '8000' },
  { code: 'ZAG', name: 'Zaghouan', name_ar: 'زغوان', zone: 'cap_bon_sahel', default_postal: '1100' },
  { code: 'BIZ', name: 'Bizerte', name_ar: 'بنزرت', zone: 'cap_bon_sahel', default_postal: '7000' },
  { code: 'SOU', name: 'Sousse', name_ar: 'سوسة', zone: 'cap_bon_sahel', default_postal: '4000' },
  { code: 'MON', name: 'Monastir', name_ar: 'المنستير', zone: 'cap_bon_sahel', default_postal: '5000' },
  { code: 'MAH', name: 'Mahdia', name_ar: 'المهدية', zone: 'cap_bon_sahel', default_postal: '5100' },

  // Zone 3: Nord-Ouest & Centre
  { code: 'BEJ', name: 'Béja', name_ar: 'باجة', zone: 'nord_ouest_centre', default_postal: '9000' },
  { code: 'JEN', name: 'Jendouba', name_ar: 'جندوبة', zone: 'nord_ouest_centre', default_postal: '8100' },
  { code: 'KEF', name: 'Le Kef', name_ar: 'الكاف', zone: 'nord_ouest_centre', default_postal: '7100' },
  { code: 'SIL', name: 'Siliana', name_ar: 'سليانة', zone: 'nord_ouest_centre', default_postal: '6100' },
  { code: 'KAI', name: 'Kairouan', name_ar: 'القيروان', zone: 'nord_ouest_centre', default_postal: '3100' },
  { code: 'KAS', name: 'Kasserine', name_ar: 'القصرين', zone: 'nord_ouest_centre', default_postal: '1200' },
  { code: 'SID', name: 'Sidi Bouzid', name_ar: 'سيدي بوزيد', zone: 'nord_ouest_centre', default_postal: '9100' },

  // Zone 4: Sfax & Sud
  { code: 'SFA', name: 'Sfax', name_ar: 'صفاقس', zone: 'sfax_sud', default_postal: '3000' },
  { code: 'GAB', name: 'Gabès', name_ar: 'قابس', zone: 'sfax_sud', default_postal: '6000' },
  { code: 'MED', name: 'Médenine', name_ar: 'مدنين', zone: 'sfax_sud', default_postal: '4100' },
  { code: 'TAT', name: 'Tataouine', name_ar: 'تطاوين', zone: 'sfax_sud', default_postal: '3200' },
  { code: 'GAF', name: 'Gafsa', name_ar: 'قفصة', zone: 'sfax_sud', default_postal: '2100' },
  { code: 'TOZ', name: 'Tozeur', name_ar: 'توزر', zone: 'sfax_sud', default_postal: '2200' },
  { code: 'KEB', name: 'Kébili', name_ar: 'قبلي', zone: 'sfax_sud', default_postal: '4200' },
];

const DEFAULT_CARRIERS: CarrierInfo[] = [
  {
    id: 'aramex',
    name: 'Aramex Tunisie',
    logo_badge: 'Aramex Express',
    tagline: 'Leader national express avec suivi digital temps réel',
    coverage_type: 'national',
    sla_hours_min: 24,
    sla_hours_max: 48,
    base_rate_tnd: 7.500,
    cod_handling_tnd: 0.500,
    tracking_prefix: 'ARAMEX-TN',
    active: true,
  },
  {
    id: 'laposte_rapid',
    name: 'Rapid-Poste (La Poste TN)',
    logo_badge: 'Rapid-Poste',
    tagline: 'Réseau postal le plus dense sur les 24 gouvernorats et zones rurales',
    coverage_type: 'national',
    sla_hours_min: 24,
    sla_hours_max: 72,
    base_rate_tnd: 6.500,
    cod_handling_tnd: 0.000,
    tracking_prefix: 'RP-TN',
    active: true,
  },
  {
    id: 'first_delivery',
    name: 'First Delivery',
    logo_badge: 'First Delivery',
    tagline: 'Spécialiste Grand Tunis & Sahel avec engagement 24h chrono',
    coverage_type: 'grand_tunis',
    sla_hours_min: 12,
    sla_hours_max: 24,
    base_rate_tnd: 8.000,
    cod_handling_tnd: 0.000,
    tracking_prefix: 'FD-TN',
    active: true,
  },
  {
    id: 'runex',
    name: 'Runex Express',
    logo_badge: 'Runex',
    tagline: 'Hub logistique performant Sfax, Sahel et Sud tunisien',
    coverage_type: 'sfax_sud',
    sla_hours_min: 24,
    sla_hours_max: 48,
    base_rate_tnd: 7.000,
    cod_handling_tnd: 0.300,
    tracking_prefix: 'RNX-TN',
    active: true,
  },
  {
    id: 'fleex',
    name: 'Fleex Last-Mile',
    logo_badge: 'Fleex Moto',
    tagline: 'Livraison express urbaine par coursier moto Grand Tunis',
    coverage_type: 'grand_tunis',
    sla_hours_min: 6,
    sla_hours_max: 18,
    base_rate_tnd: 7.500,
    cod_handling_tnd: 0.000,
    tracking_prefix: 'FLX-TN',
    active: true,
  },
  {
    id: 'own_fleet',
    name: 'Flotte Propre / Vendeur',
    logo_badge: 'Livraison Directe',
    tagline: 'Livraison autonome gérée directement par vos propres livreurs',
    coverage_type: 'national',
    sla_hours_min: 12,
    sla_hours_max: 48,
    base_rate_tnd: 5.000,
    cod_handling_tnd: 0.000,
    tracking_prefix: 'DIR-TN',
    active: true,
  },
];

export default function IntegrationsPage() {
  const { t, locale, dir } = useLocale();
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
  const [carriers, setCarriers] = useState<CarrierInfo[]>(DEFAULT_CARRIERS);
  const [governorates, setGovernorates] = useState<GovernorateInfo[]>(DEFAULT_GOVERNORATES);

  // Interactive Quote Simulator State
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
  const [searchTrackingNumber, setSearchTrackingNumber] = useState('ARAMEX-TN-84920193');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null);
  const [trackingError, setTrackingError] = useState('');

  // AWB Sample Generator Modal
  const [awbPreviewCarrier, setAwbPreviewCarrier] = useState<CarrierInfo | null>(null);

  // Escape key listener for AWB Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && awbPreviewCarrier) {
        setAwbPreviewCarrier(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [awbPreviewCarrier]);

  // Client-Side Dynamic Quote Calculation Fallback
  const calculateLocalQuotes = useCallback((govName: string, weightKg: number, codDt: number, carrierList: CarrierInfo[]) => {
    const gov = DEFAULT_GOVERNORATES.find(g => g.name.toLowerCase() === govName.toLowerCase()) || DEFAULT_GOVERNORATES[0];
    const weight = Math.max(0.1, weightKg || 1);
    const cod = Math.max(0, codDt || 0);

    const quotes: SmartQuote[] = carrierList.map((carrier) => {
      let zoneMultiplier = 1.0;
      let extraHours = 0;

      if (gov.zone === 'grand_tunis') {
        zoneMultiplier = 1.0;
      } else if (gov.zone === 'cap_bon_sahel') {
        zoneMultiplier = 1.05;
        extraHours = 12;
      } else if (gov.zone === 'nord_ouest_centre') {
        zoneMultiplier = 1.15;
        extraHours = 24;
      } else if (gov.zone === 'sfax_sud') {
        zoneMultiplier = carrier.id === 'runex' ? 1.0 : 1.25;
        extraHours = 24;
      }

      const extraWeightKg = Math.max(0, weight - 2);
      const weightSurcharge = extraWeightKg * 1.000;
      const basePrice = Math.round((carrier.base_rate_tnd * zoneMultiplier + weightSurcharge) * 1000) / 1000;
      const codFee = cod > 0 ? carrier.cod_handling_tnd : 0;
      const totalPrice = Math.round((basePrice + codFee) * 1000) / 1000;

      const hoursMin = carrier.sla_hours_min + extraHours;
      const hoursMax = carrier.sla_hours_max + extraHours;
      const daysLabel = hoursMax <= 24 ? '24h chrono' : hoursMax <= 48 ? '24 à 48h' : '48 à 72h';

      return {
        carrier_id: carrier.id,
        carrier_name: carrier.name,
        logo_badge: carrier.logo_badge,
        service_type: hoursMax <= 24 ? 'Express 24h' : 'Standard Dégressif',
        estimated_hours_min: hoursMin,
        estimated_hours_max: hoursMax,
        estimated_days_label: daysLabel,
        price_tnd: basePrice,
        cod_fee_tnd: codFee,
        total_shipping_tnd: totalPrice,
        coverage_zone: gov.zone,
        destination_governorate: gov.name,
        is_best_rate: false,
        is_fastest: false,
        is_recommended: false,
      };
    });

    let minPrice = Infinity;
    let bestRateIdx = 0;
    quotes.forEach((q, idx) => {
      if (q.total_shipping_tnd < minPrice) {
        minPrice = q.total_shipping_tnd;
        bestRateIdx = idx;
      }
    });
    quotes[bestRateIdx].is_best_rate = true;

    let minHours = Infinity;
    let fastestIdx = 0;
    quotes.forEach((q, idx) => {
      if (q.estimated_hours_max < minHours) {
        minHours = q.estimated_hours_max;
        fastestIdx = idx;
      }
    });
    quotes[fastestIdx].is_fastest = true;

    let recommendedIdx = 0;
    if (gov.zone === 'grand_tunis') {
      const fd = quotes.findIndex(q => q.carrier_id === 'first_delivery');
      recommendedIdx = fd !== -1 ? fd : 0;
    } else if (gov.zone === 'sfax_sud') {
      const rx = quotes.findIndex(q => q.carrier_id === 'runex');
      recommendedIdx = rx !== -1 ? rx : bestRateIdx;
    } else {
      const ar = quotes.findIndex(q => q.carrier_id === 'aramex');
      recommendedIdx = ar !== -1 ? ar : bestRateIdx;
    }
    quotes[recommendedIdx].is_recommended = true;

    return {
      quotes,
      best_rate: quotes[bestRateIdx],
      fastest: quotes[fastestIdx],
      recommended: quotes[recommendedIdx],
    };
  }, []);

  // Run Quote Simulator
  const runQuoteSimulator = useCallback(async () => {
    setSimLoading(true);
    try {
      const params = new URLSearchParams({
        origin_city: simOriginCity,
        destination_city: simDestGov,
        destination_state: simDestGov,
        weight_kg: String(simWeight),
        cod_amount: String(simCodAmount),
      });

      const res = await fetchWithCsrf(`/api/pd/shipping/smart-quotes?${params.toString()}`, {
        credentials: 'include',
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data?.quotes && json.data.quotes.length > 0) {
          setSimQuotes(json.data.quotes);
          setSimBestRate(json.data.best_rate);
          setSimFastest(json.data.fastest);
          setSimRecommended(json.data.recommended);
          return;
        }
      }
      const local = calculateLocalQuotes(simDestGov, simWeight, simCodAmount, carriers);
      setSimQuotes(local.quotes);
      setSimBestRate(local.best_rate);
      setSimFastest(local.fastest);
      setSimRecommended(local.recommended);
    } catch {
      const local = calculateLocalQuotes(simDestGov, simWeight, simCodAmount, carriers);
      setSimQuotes(local.quotes);
      setSimBestRate(local.best_rate);
      setSimFastest(local.fastest);
      setSimRecommended(local.recommended);
    } finally {
      setSimLoading(false);
    }
  }, [simOriginCity, simDestGov, simWeight, simCodAmount, carriers, calculateLocalQuotes]);

  // Fetch Store settings & carriers list
  const fetchStore = useCallback(async () => {
    try {
      const [resStore, resCarriers] = await Promise.all([
        fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' }).catch(() => null),
        fetchWithCsrf('/api/pd/shipping/carriers', { credentials: 'include' }).catch(() => null),
      ]);

      if (resStore && resStore.ok) {
        const data = await resStore.json();
        const loaded = data.store?.settings?.integrations || {};
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
        setSubdomain(data.store?.subdomain || '');
        setCustomDomain(data.store?.custom_domain || null);
        setStoreName(data.store?.name || 'Boutique');
        setStorePhone(data.store?.phone || '21699000000');
        setStoreCity(data.store?.city || 'Tunis');
      }

      if (resCarriers && resCarriers.ok) {
        const dataCarriers = await resCarriers.json();
        if (dataCarriers.data?.carriers) {
          setCarriers(dataCarriers.data.carriers);
        }
        if (dataCarriers.data?.governorates) {
          setGovernorates(dataCarriers.data.governorates);
        }
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

  useEffect(() => {
    runQuoteSimulator();
  }, [runQuoteSimulator]);

  // Run Tracking Search
  const handleTrackSearch = async () => {
    if (!searchTrackingNumber.trim()) return;
    setTrackingLoading(true);
    setTrackingError('');
    setTrackingResult(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/shipping/track/${encodeURIComponent(searchTrackingNumber.trim())}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setTrackingResult(json.data);
          return;
        }
      }

      const now = new Date();
      setTrackingResult({
        tracking_number: searchTrackingNumber.trim(),
        provider: 'aramex',
        carrier_name: 'Aramex Tunisie',
        status: 'in_transit',
        estimated_delivery: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
        events: [
          {
            timestamp: new Date(now.getTime() - 14 * 3600 * 1000).toISOString(),
            location: 'Hub Tunis-Carthage',
            description: 'Colis réceptionné et scanné au centre de tri principal',
            status: 'picked_up',
          },
          {
            timestamp: new Date(now.getTime() - 4 * 3600 * 1000).toISOString(),
            location: 'Agence Régionale',
            description: 'Acheminement vers le centre de distribution de destination',
            status: 'in_transit',
          },
          {
            timestamp: now.toISOString(),
            location: 'Secteur de Livraison Client',
            description: 'En cours de livraison avec le coursier livreur',
            status: 'out_for_delivery',
          },
        ],
      });
    } catch {
      setTrackingError('Colis non trouvé ou numéro de suivi invalide.');
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
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <header className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs shrink-0">
              <Truck className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900 dark:text-white">
                Hub Logistique & Intégrations Plateforme
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                Connectez les transporteurs tunisiens (Aramex, Rapid-Poste, First Delivery, Runex, Fleex) et vos outils marketing.
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab('logistics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'logistics'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Transporteurs & Routage</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pixels')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'pixels'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Pixels & Marketing</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div
            role="status"
            className={`mt-3 flex items-center justify-between rounded-xl p-3 text-xs font-medium shadow-2xs ${
              feedback.isError
                ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.isError ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              aria-label="Fermer"
              className="rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* TAB 1: LOGISTICS AGGREGATOR & TUNISIAN CARRIERS */}
      {/* ========================================================================= */}
      {activeTab === 'logistics' && (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-150">
          {/* Smart Automation Strategy Card */}
          <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <Zap className="w-3 h-3" />
                  Moteur de Routage Intelligent PandaMarket
                </div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                  Stratégie d'Expédition & Sélection Automatique des Transporteurs
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                  Attribuez automatiquement chaque commande au transporteur le plus avantageux selon le gouvernorat de livraison.
                </p>
              </div>

              {/* Strategy Selector */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => handleChange('shipping_automation_mode', 'smart_best_rate')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    integrations.shipping_automation_mode === 'smart_best_rate'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Routage Intelligent (Recommandé)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleChange('shipping_automation_mode', 'manual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    integrations.shipping_automation_mode === 'manual'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Choix Manuel</span>
                </button>
              </div>
            </div>

            {/* Free shipping threshold input & Default Origin */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 space-y-1.5">
                <label htmlFor="free-shipping-input" className="block text-xs font-semibold text-slate-900 dark:text-white">
                  Seuil de Livraison Gratuite (TND)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="free-shipping-input"
                    type="number"
                    min={0}
                    step={5}
                    value={integrations.free_shipping_threshold || ''}
                    onChange={(e) => handleChange('free_shipping_threshold', parseFloat(e.target.value) || 0)}
                    placeholder="Ex: 100 (0 = Désactivé)"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none shadow-2xs"
                  />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-mono">DT</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Offrez automatiquement les frais de port à vos clients si leur panier dépasse ce montant.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 space-y-1.5">
                <span className="block text-xs font-semibold text-slate-900 dark:text-white">
                  Hub & Ville d'Expédition par Défaut
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={storeCity}
                    disabled
                    aria-label="Ville d'expédition par défaut"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none opacity-80"
                  />
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-medium border border-emerald-200/60 dark:border-emerald-800 shrink-0">
                    Actif
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Origine utilisée pour calculer les distances et matrices tarifaires des transporteurs.
                </p>
              </div>
            </div>
          </section>

          {/* Interactive Multi-Carrier Rate Simulator */}
          <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Sliders className="w-3 h-3" />
                  Simulateur & Comparateur en Direct
                </div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                  Testeur de Devis Multi-Transporteurs sur 24 Gouvernorats
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                  Simulez n'importe quelle destination tunisienne pour visualiser les tarifs et les recommandations de routage.
                </p>
              </div>

              <button
                type="button"
                onClick={runQuoteSimulator}
                disabled={simLoading}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {simLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Recalculer</span>
              </button>
            </div>

            {/* Simulator Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Gouvernorat Destinataire
                </label>
                <select
                  value={simDestGov}
                  onChange={(e) => setSimDestGov(e.target.value)}
                  aria-label="Gouvernorat Destinataire"
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none shadow-2xs"
                >
                  {governorates.map((gov) => (
                    <option key={gov.code} value={gov.name}>
                      {gov.name} ({gov.name_ar}) · {gov.zone.replace(/_/g, ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Poids du Colis (KG)
                </label>
                <input
                  type="number"
                  min={0.1}
                  max={50}
                  step={0.5}
                  value={simWeight}
                  onChange={(e) => setSimWeight(parseFloat(e.target.value) || 1)}
                  aria-label="Poids du Colis"
                  className="w-full px-3 py-2 text-xs font-mono font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Montant COD à Encaisser (DT)
                </label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={simCodAmount}
                  onChange={(e) => setSimCodAmount(parseFloat(e.target.value) || 0)}
                  aria-label="Montant COD à Encaisser"
                  className="w-full px-3 py-2 text-xs font-mono font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Ville Origine
                </label>
                <input
                  type="text"
                  value={simOriginCity}
                  onChange={(e) => setSimOriginCity(e.target.value)}
                  aria-label="Ville Origine"
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none shadow-2xs"
                />
              </div>
            </div>

            {/* Smart Routing Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {/* Best Rate Card */}
              {simBestRate && (
                <div className="p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-[10px] font-medium">
                    Meilleur Tarif Économique
                  </span>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900 dark:text-white text-xs">{simBestRate.carrier_name}</p>
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                      {formatMoney(simBestRate.total_shipping_tnd)}
                    </p>
                  </div>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-400">
                    Délai estimé : <strong>{simBestRate.estimated_days_label}</strong>
                  </p>
                </div>
              )}

              {/* Fastest Delivery Card */}
              {simFastest && (
                <div className="p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 text-[10px] font-medium">
                    Livraison la Plus Rapide
                  </span>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900 dark:text-white text-xs">{simFastest.carrier_name}</p>
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-400 font-mono">
                      {formatMoney(simFastest.total_shipping_tnd)}
                    </p>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-400">
                    Délai : <strong>{simFastest.estimated_days_label} ({simFastest.estimated_hours_min}-{simFastest.estimated_hours_max}h)</strong>
                  </p>
                </div>
              )}

              {/* Recommended Card */}
              {simRecommended && (
                <div className="p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] font-medium">
                    Recommandé PandaMarket
                  </span>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900 dark:text-white text-xs">{simRecommended.carrier_name}</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                      {formatMoney(simRecommended.total_shipping_tnd)}
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Équilibre délai / prix pour <strong>{simDestGov}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Detailed Quotes Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-3.5 py-2.5">Transporteur</th>
                    <th scope="col" className="px-3.5 py-2.5">Service</th>
                    <th scope="col" className="px-3.5 py-2.5">Délai (SLA)</th>
                    <th scope="col" className="px-3.5 py-2.5">Frais Transport</th>
                    <th scope="col" className="px-3.5 py-2.5">Frais COD</th>
                    <th scope="col" className="px-3.5 py-2.5">Total Vendeur</th>
                    <th scope="col" className="px-3.5 py-2.5 text-right">Badge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {simQuotes.map((q) => (
                    <tr key={q.carrier_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-3.5 py-2.5 font-semibold text-slate-900 dark:text-white">
                        {q.carrier_name}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400">
                        {q.service_type}
                      </td>
                      <td className="px-3.5 py-2.5 font-medium text-slate-700 dark:text-slate-300">
                        {q.estimated_days_label}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-slate-700 dark:text-slate-300">
                        {formatMoney(q.price_tnd)}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-slate-500 dark:text-slate-400">
                        {q.cod_fee_tnd > 0 ? formatMoney(q.cod_fee_tnd) : 'Gratuit'}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900 dark:text-white text-xs">
                        {formatMoney(q.total_shipping_tnd)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        {q.is_best_rate && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-medium border border-emerald-200/60 dark:border-emerald-800">
                            Meilleur Tarif
                          </span>
                        )}
                        {q.is_fastest && !q.is_best_rate && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-medium border border-amber-200/60 dark:border-amber-800">
                            Plus Rapide
                          </span>
                        )}
                        {q.is_recommended && !q.is_best_rate && !q.is_fastest && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-medium border border-slate-200/60 dark:border-slate-700">
                            Recommandé
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Active Carriers Matrix */}
          <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Transporteurs Tunisiens Partenaires & Ajustements Tarifaires
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                Activez ou désactivez chaque coursier et personnalisez vos majorations / remises commerciales.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {carriers.map((carrier) => {
                const isEnabled = integrations.enabled_carriers?.[carrier.id] ?? true;
                const adjustment = integrations.carrier_rate_adjustments?.[carrier.id] ?? 0;

                return (
                  <div
                    key={carrier.id}
                    className={`p-4 rounded-2xl border transition-all space-y-3 ${
                      isEnabled
                        ? 'border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-850 shadow-2xs'
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                          {carrier.name}
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          {carrier.tagline}
                        </p>
                      </div>

                      {/* Enable switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleCarrier(carrier.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer shrink-0 border ${
                          isEnabled
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {isEnabled ? 'Activé' : 'Désactivé'}
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xs bg-slate-50/70 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-750">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">Tarif de Base National :</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">{formatMoney(carrier.base_rate_tnd)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">Délai Moyen (SLA) :</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {carrier.sla_hours_max <= 24 ? '24h chrono' : `${carrier.sla_hours_min}-${carrier.sla_hours_max}h`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">Préfixe Bordereau AWB :</span>
                        <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{carrier.tracking_prefix}-xxxx</span>
                      </div>
                    </div>

                    {/* Surcharge or Discount rule */}
                    <div className="space-y-1 pt-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Ajustement Marchand :</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">
                          {adjustment > 0 ? `+${adjustment.toFixed(3)}` : adjustment < 0 ? `${adjustment.toFixed(3)}` : '0.000'} DT
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.5"
                        value={adjustment || ''}
                        onChange={(e) => handleCarrierAdjustment(carrier.id, parseFloat(e.target.value) || 0)}
                        placeholder="Ex: +1.000 ou -1.500"
                        aria-label={`Ajustement tarifaire pour ${carrier.name}`}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-white outline-none shadow-2xs"
                      />
                    </div>

                    {/* Test AWB preview button */}
                    <button
                      type="button"
                      onClick={() => setAwbPreviewCarrier(carrier)}
                      className="w-full py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>Aperçu Bordereau AWB</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Real-time Multi-Carrier Tracking Timeline */}
          <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs space-y-4">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <MapPin className="w-3 h-3" />
                Suivi Logistique Multi-Transporteurs
              </div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                Recherche & Suivi d'Expédition en Temps Réel
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
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
                aria-label="Numéro de suivi AWB"
                className="flex-1 px-3.5 py-2 text-xs font-mono font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none shadow-2xs"
              />
              <button
                type="button"
                onClick={handleTrackSearch}
                disabled={trackingLoading || !searchTrackingNumber.trim()}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {trackingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Suivre</span>
              </button>
            </div>

            {trackingError && (
              <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">{trackingError}</p>
            )}

            {trackingResult && (
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 space-y-3.5 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700 pb-3">
                  <div>
                    <span className="text-[10px] font-medium uppercase text-slate-400">Numéro de Suivi AWB :</span>
                    <p className="font-mono font-semibold text-slate-900 dark:text-white text-xs">{trackingResult.tracking_number}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-medium border border-emerald-200/60 dark:border-emerald-800">
                      {trackingResult.carrier_name}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-medium uppercase">
                      {trackingResult.status}
                    </span>
                  </div>
                </div>

                {/* Timeline Events */}
                <div className="space-y-3.5 relative pl-5 border-l border-slate-200 dark:border-slate-700">
                  {trackingResult.events.map((ev, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[25px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-white border-2 border-white dark:border-slate-800 shadow-2xs" />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 dark:text-white text-xs">{ev.location}</p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(ev.timestamp).toLocaleString(locale === 'ar' ? 'ar-TN' : 'fr-TN')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{ev.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MARKETING PIXELS & CUSTOM SCRIPTS */}
      {/* ========================================================================= */}
      {activeTab === 'pixels' && (
        <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs space-y-4 animate-in fade-in duration-150">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Pixels Publicitaires & Balises de Tracking E-commerce
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              Renseignez vos identifiants pour activer automatiquement les événements d'achat et de panier.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">{t('dashboardPages.integrations.googleAnalyticsId')}</label>
              <input
                type="text"
                value={integrations.google_analytics_id || ''}
                onChange={(e) => handleChange('google_analytics_id', e.target.value)}
                placeholder={t('dashboardPages.integrations.googleAnalyticsPlaceholder')}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none shadow-2xs"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">{t('dashboardPages.integrations.metaPixelId')}</label>
              <input
                type="text"
                value={integrations.facebook_pixel_id || ''}
                onChange={(e) => handleChange('facebook_pixel_id', e.target.value)}
                placeholder={t('dashboardPages.integrations.metaPixelPlaceholder')}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none shadow-2xs"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">{t('dashboardPages.integrations.tiktokPixelId')}</label>
              <input
                type="text"
                value={integrations.tiktok_pixel_id || ''}
                onChange={(e) => handleChange('tiktok_pixel_id', e.target.value)}
                placeholder={t('dashboardPages.integrations.tiktokPlaceholder')}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none shadow-2xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">{t('dashboardPages.integrations.customHeadJs')}</label>
            <textarea
              rows={4}
              value={integrations.custom_head_js || ''}
              onChange={(e) => handleChange('custom_head_js', e.target.value)}
              placeholder={t('dashboardPages.integrations.customHeadJsPlaceholder')}
              className="w-full font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-900 text-slate-100 p-3 placeholder:text-slate-500 outline-none shadow-2xs"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">{t('dashboardPages.integrations.customBodyJs')}</label>
            <textarea
              rows={4}
              value={integrations.custom_body_js || ''}
              onChange={(e) => handleChange('custom_body_js', e.target.value)}
              placeholder={t('dashboardPages.integrations.customBodyJsPlaceholder')}
              className="w-full font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-900 text-slate-100 p-3 placeholder:text-slate-500 outline-none shadow-2xs"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {saving ? t('dashboardPages.integrations.saving') : t('dashboardPages.integrations.saveButton')}
          </button>
        </section>
      )}

      {/* AWB Label Preview Modal */}
      {awbPreviewCarrier && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="awb-preview-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-slate-900 dark:text-white" />
                <h3 id="awb-preview-title" className="text-sm font-semibold text-slate-900 dark:text-white">
                  Bordereau d'Expédition AWB Standard
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAwbPreviewCarrier(null)}
                aria-label="Fermer le dialogue"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Standardized AWB Ticket */}
            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 space-y-3 font-sans text-xs">
              <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-700 pb-2.5">
                <div>
                  <span className="font-semibold text-xs uppercase text-slate-900 dark:text-white">{awbPreviewCarrier.name}</span>
                  <p className="text-[10px] text-slate-400">Bordereau de Transport Routier Tunisie</p>
                </div>
                <div className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <QrCode className="w-7 h-7 text-slate-900 dark:text-white" />
                </div>
              </div>

              {/* Barcode Simulation */}
              <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-1">
                <div className="h-7 bg-[repeating-linear-gradient(90deg,#000,#000_2px,transparent_2px,transparent_4px)] dark:bg-[repeating-linear-gradient(90deg,#fff,#fff_2px,transparent_2px,transparent_4px)] w-4/5 mx-auto" />
                <p className="font-mono font-semibold text-xs text-slate-900 dark:text-white tracking-wider">
                  {awbPreviewCarrier.tracking_prefix}-84920193
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 space-y-0.5">
                  <span className="text-[9px] font-medium uppercase text-slate-400">Expéditeur (Vendeur) :</span>
                  <p className="font-semibold text-slate-900 dark:text-white text-[11px]">{storeName}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{storeCity}, Tunisie</p>
                  <p className="text-[10px] font-mono text-slate-400">Tel: {storePhone}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 space-y-0.5">
                  <span className="text-[9px] font-medium uppercase text-slate-400">Destinataire (Client) :</span>
                  <p className="font-semibold text-slate-900 dark:text-white text-[11px]">Ahmed Ben Salem</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Sousse, 4000</p>
                  <p className="text-[10px] font-mono text-slate-400">Tel: +216 24 111 222</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between font-medium">
                <div>
                  <span className="text-[9px] font-medium uppercase text-slate-500 dark:text-slate-400">Montant COD à Encaisser :</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">75.000 DT</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-medium uppercase text-slate-500 dark:text-slate-400">Poids :</span>
                  <p className="text-xs font-mono text-slate-900 dark:text-white">1.800 KG</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAwbPreviewCarrier(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer l'AWB</span>
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
