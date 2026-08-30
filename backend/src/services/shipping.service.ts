/**
 * ShippingService — Unified Local Tunisian Logistics Aggregator.
 *
 * Supports:
 *   - Aramex Tunisie (National 24 gouvernorats)
 *   - Rapid-Poste / La Poste Tunisienne (National + Remote zones)
 *   - First Delivery Express (Grand Tunis & Sahel 24h)
 *   - Runex Express (Sfax, Centre & Sud)
 *   - Fleex Last-Mile (Grand Tunis Moto / Same-Day)
 *   - Flotte Propre / Vendeur (Self-Managed Delivery)
 *
 * Features:
 *   - "Best Rate" & "Fastest Delivery" Smart Routing Engine
 *   - 24 Tunisian Governorates Geographic Zone Matrix
 *   - Unified AWB Generation & Standardized Label PDF Document
 *   - Multi-Carrier Tracking Checkpoint Events
 */

import { query, transaction } from '../db/pool';
import { pdId } from '../utils/crypto';
import { logger } from '../utils/logger';
import { IAddress, ProductType } from '@pandamarket/types';
import { randomInt } from 'node:crypto';
import { config } from '../config';
import { PdErrorCode, PdNotFoundError, PdValidationError } from '../errors';
import { eventBus, PdEvent } from '../events/event-bus';
import { adsService } from './ads.service';
import { syncOrderStatusFromFulfillments, restoreOrderItemStock } from './order-fulfillment-shared';
import {
  CarrierAdapter,
  CarrierAdapterError,
  CarrierId,
  CarrierShipmentRequest,
  CarrierShipmentStatus,
  CarrierTrackingEvent,
  CarrierTrackingResult,
  createConfiguredCarrierAdapter,
} from './carrier-adapter';

// =====================================================
// Tunisian Governorates & Zone Matrix
// =====================================================

export interface TunisianGovernorate {
  code: string;
  name: string;
  name_ar: string;
  zone: 'grand_tunis' | 'cap_bon_sahel' | 'nord_ouest_centre' | 'sfax_sud';
  default_postal: string;
}

export const TUNISIAN_GOVERNORATES: TunisianGovernorate[] = [
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

export function resolveTunisianGovernorate(cityOrState?: string | null): TunisianGovernorate {
  const query = (cityOrState || '').trim().toLowerCase();
  const found = TUNISIAN_GOVERNORATES.find(g =>
    query.includes(g.name.toLowerCase()) ||
    query.includes(g.name_ar) ||
    g.name.toLowerCase().includes(query)
  );
  return found || TUNISIAN_GOVERNORATES[0]; // Default Tunis
}

// =====================================================
// Unified Carrier Adapters
// =====================================================

export type { CarrierId } from './carrier-adapter';

export interface CarrierInfo {
  id: CarrierId;
  name: string;
  logo_badge: string;
  tagline: string;
  coverage_type: 'national' | 'grand_tunis' | 'sahel' | 'sfax_sud';
  sla_hours_min: number;
  sla_hours_max: number;
  base_rate_tnd: number;
  cod_handling_tnd: number;
  tracking_prefix: string;
  active: boolean;
  adapter_mode?: 'http' | 'manual' | 'simulation';
  adapter_configured?: boolean;
}

export const TUNISIAN_CARRIERS: CarrierInfo[] = [
  {
    id: 'aramex',
    name: 'Aramex Tunisie',
    logo_badge: '🔴 Aramex Express',
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
    logo_badge: '🟡 Rapid-Poste',
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
    logo_badge: '⚡ First Delivery',
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
    logo_badge: '🚀 Runex',
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
    logo_badge: '🛵 Fleex Moto',
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
    logo_badge: '🚚 Livraison Directe',
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

// =====================================================
// Types
// =====================================================

export interface ShippingRateRequest {
  origin_city: string;
  origin_country?: string;
  destination: IAddress;
  weight_kg: number;
  cod_amount?: number;
  provider?: CarrierId | 'auto';
}

export interface SmartShippingQuote {
  carrier_id: CarrierId;
  carrier_name: string;
  logo_badge: string;
  service_type: string;
  estimated_hours_min: number;
  estimated_hours_max: number;
  estimated_days_label: string;
  price_tnd: number;
  cod_fee_tnd: number;
  total_shipping_tnd: number;
  currency: string;
  coverage_zone: string;
  destination_governorate: string;
  is_best_rate: boolean;
  is_fastest: boolean;
  is_recommended: boolean;
  source?: 'configured_carrier' | 'platform_fallback';
}

export interface ShipmentRequest {
  order_id: string;
  fulfillment_id: string;
  store_id: string;
  sender: {
    name: string;
    phone: string;
    address: IAddress;
  };
  recipient: {
    name: string;
    phone: string;
    email?: string;
    address: IAddress;
  };
  parcels: Array<{
    weight_kg: number;
    description: string;
    quantity?: number;
  }>;
  provider?: CarrierId;
  cod_amount?: number;
}

export interface ShipmentResult {
  id: string;
  tracking_number: string;
  provider: string;
  carrier_name: string;
  label_url: string | null;
  estimated_delivery: string | null;
  status: string;
  provider_reference?: string | null;
  source?: 'configured_carrier' | 'simulation' | 'manual';
  fallback_reason?: string | null;
}

export interface TrackingEvent {
  timestamp: string;
  location: string;
  description: string;
  status: string;
}

export interface TrackingInfo {
  tracking_number: string;
  provider: string;
  carrier_name: string;
  status: string;
  events: TrackingEvent[];
  estimated_delivery: string | null;
  source?: 'configured_carrier' | 'simulation';
}

function normalizeCarrierId(provider?: CarrierId | 'auto'): CarrierId {
  if (!provider || provider === 'auto') return 'aramex';
  if ((provider as string) === 'manual') return 'own_fleet';
  return provider === 'laposte' ? 'laposte_rapid' : provider;
}

function carrierEnvId(provider: CarrierId): CarrierId {
  return provider === 'laposte' ? 'laposte_rapid' : provider;
}

function nextSyncForStatus(status: CarrierShipmentStatus): Date | null {
  if (status === 'delivered' || status === 'cancelled' || status === 'returned') return null;
  const intervalMs = status === 'created' ? 15 * 60 * 1000 : 60 * 60 * 1000;
  return new Date(Date.now() + intervalMs);
}

function safeDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapTrackingStatus(status: CarrierShipmentStatus): string {
  return status;
}

function normalizePersistedShipmentStatus(value: unknown): CarrierShipmentStatus {
  switch (String(value || '').trim().toLowerCase()) {
    case 'created':
    case 'picked_up':
    case 'in_transit':
    case 'out_for_delivery':
    case 'delivered':
    case 'cancelled':
    case 'returned':
      return String(value).trim().toLowerCase() as CarrierShipmentStatus;
    default:
      // Older rows can contain values from the pre-adapter implementation.
      // Treat them as newly created rather than returning an invalid provider
      // status to the tracking contract.
      return 'created';
  }
}

// =====================================================
// Service
// =====================================================

export class ShippingService {
  private getShippingConfig() {
    return config.shipping || {
      simulationFallback: false,
      requestTimeoutMs: 8000,
      maxAttempts: 3,
    };
  }

  private getAdapter(provider: CarrierId): CarrierAdapter | null {
    const normalized = carrierEnvId(provider);
    if (normalized === 'own_fleet') return null;
    const shippingConfig = this.getShippingConfig();
    return createConfiguredCarrierAdapter(normalized, {
      timeoutMs: shippingConfig.requestTimeoutMs,
      maxAttempts: shippingConfig.maxAttempts,
    });
  }

  private getAdapterState(provider: CarrierId): { mode: 'http' | 'manual' | 'simulation'; configured: boolean } {
    if (provider === 'own_fleet') return { mode: 'manual', configured: false };
    return this.getAdapter(provider)
      ? { mode: 'http', configured: true }
      : { mode: 'simulation', configured: false };
  }

  /**
   * Get all active carriers and governorates.
   */
  getCarriersAndGovernorates() {
    return {
      carriers: TUNISIAN_CARRIERS.map((carrier) => ({
        ...carrier,
        ...(() => {
          const state = this.getAdapterState(carrier.id);
          return { adapter_mode: state.mode, adapter_configured: state.configured };
        })(),
      })),
      governorates: TUNISIAN_GOVERNORATES,
      simulation_fallback_enabled: this.getShippingConfig().simulationFallback,
    };
  }

  /**
   * Calculate smart quotes across all Tunisian carriers with Best Rate & Fastest routing.
   */
  async calculateSmartQuotes(req: ShippingRateRequest): Promise<{
    quotes: SmartShippingQuote[];
    best_rate: SmartShippingQuote;
    fastest: SmartShippingQuote;
    recommended: SmartShippingQuote;
    destination_gov: TunisianGovernorate;
  }> {
    const destAny = req.destination as unknown as Record<string, unknown>;
    const gov = resolveTunisianGovernorate((destAny.state as string) || req.destination.city);
    const weight = Math.max(0.1, req.weight_kg || 1);
    const cod = Math.max(0, req.cod_amount || 0);

    const quotes: SmartShippingQuote[] = TUNISIAN_CARRIERS.map((carrier) => {
      let zoneMultiplier = 1.0;
      let extraHours = 0;

      // Adjust rates and SLA based on zone matrix
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

      // Weight tier extra (over 2kg)
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
        currency: 'TND',
        coverage_zone: gov.zone,
        destination_governorate: gov.name,
        is_best_rate: false,
        is_fastest: false,
        is_recommended: false,
        source: 'platform_fallback',
      };
    });

    // Replace fallback estimates with configured carrier rates when a provider
    // adapter is available. A provider outage never turns a quote request into
    // a 500: the caller receives the deterministic platform fallback and the
    // source flag makes that decision visible to checkout/audit code.
    const requestedCarrierIds = req.provider && req.provider !== 'auto'
      ? [normalizeCarrierId(req.provider)]
      : TUNISIAN_CARRIERS.map((carrier) => carrier.id);
    await Promise.all(requestedCarrierIds.map(async (carrierId) => {
      const adapter = this.getAdapter(carrierId);
      if (!adapter) return;
      try {
        const rate = await adapter.getRates({
          origin_city: req.origin_city,
          destination: req.destination,
          weight_kg: weight,
          cod_amount: cod,
        });
        if (!rate) return;
        const quote = quotes.find((candidate) => candidate.carrier_id === carrierId);
        if (!quote) return;
        const codFee = Math.max(0, Number(rate.cod_fee_tnd || 0));
        const basePrice = Math.max(0, Number(rate.price_tnd || 0));
        quote.price_tnd = Math.round(basePrice * 1000) / 1000;
        quote.cod_fee_tnd = Math.round(codFee * 1000) / 1000;
        quote.total_shipping_tnd = Math.round((basePrice + codFee) * 1000) / 1000;
        quote.currency = rate.currency || quote.currency;
        quote.service_type = rate.service_type || quote.service_type;
        quote.estimated_hours_min = rate.estimated_hours_min || quote.estimated_hours_min;
        quote.estimated_hours_max = rate.estimated_hours_max || quote.estimated_hours_max;
        quote.source = 'configured_carrier';
      } catch (error) {
        logger.warn({ carrier: carrierId, err: error }, 'Carrier rate adapter unavailable; using platform fallback');
      }
    }));

    // Determine Best Rate
    let minPrice = Infinity;
    let bestRateIdx = 0;
    quotes.forEach((q, idx) => {
      if (q.total_shipping_tnd < minPrice) {
        minPrice = q.total_shipping_tnd;
        bestRateIdx = idx;
      }
    });
    quotes[bestRateIdx].is_best_rate = true;

    // Determine Fastest
    let minHours = Infinity;
    let fastestIdx = 0;
    quotes.forEach((q, idx) => {
      if (q.estimated_hours_max < minHours) {
        minHours = q.estimated_hours_max;
        fastestIdx = idx;
      }
    });
    quotes[fastestIdx].is_fastest = true;

    // Determine Recommended (Aramex or Rapid-Poste or First Delivery depending on zone)
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
      destination_gov: gov,
    };
  }

  /**
   * Compatibility wrapper for calculateRates.
   */
  async calculateRates(req: ShippingRateRequest) {
    const smart = await this.calculateSmartQuotes(req);
    return smart.quotes.map(q => ({
      provider: q.carrier_id,
      service_type: q.service_type,
      estimated_days: Math.ceil(q.estimated_hours_max / 24),
      price_tnd: q.total_shipping_tnd,
      currency: 'TND',
    }));
  }

  /**
   * Create a shipment through a configured carrier adapter. Internal AWBs are
   * generated only for own-fleet delivery or when the explicitly enabled
   * development simulation fallback is active.
   */
  async createShipment(req: ShipmentRequest): Promise<ShipmentResult> {
    const carrierId = normalizeCarrierId(req.provider);
    const carrier = TUNISIAN_CARRIERS.find((candidate) => candidate.id === carrierId) || TUNISIAN_CARRIERS[0];

    const { rows: existingRows } = await query<{
      id: string;
      tracking_number: string;
      provider: string;
      provider_reference: string | null;
      label_url: string | null;
      estimated_delivery: Date | string | null;
      status: string;
      metadata: Record<string, unknown> | null;
    }>(
      `SELECT id, tracking_number, provider, provider_reference, label_url,
              estimated_delivery, status, metadata
       FROM pd_shipment
       WHERE order_id = $1 AND fulfillment_id = $2
         AND status NOT IN ('cancelled', 'returned')
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.order_id, req.fulfillment_id],
    );
    const existing = existingRows[0];
    if (existing) {
      const existingCarrierId = normalizeCarrierId(existing.provider as CarrierId);
      const existingCarrier = TUNISIAN_CARRIERS.find((candidate) => candidate.id === existingCarrierId) || carrier;
      const existingMetadata = existing.metadata || {};
      return {
        id: existing.id,
        tracking_number: existing.tracking_number,
        provider: existingCarrierId,
        carrier_name: existingCarrier.name,
        label_url: existing.label_url,
        estimated_delivery: existing.estimated_delivery ? new Date(existing.estimated_delivery).toISOString() : null,
        status: normalizePersistedShipmentStatus(existing.status),
        provider_reference: existing.provider_reference,
        source: existingMetadata.source === 'configured_carrier'
          ? 'configured_carrier'
          : existingMetadata.source === 'manual' || existingCarrierId === 'own_fleet'
            ? 'manual'
            : 'simulation',
      };
    }

    const adapter = this.getAdapter(carrierId);
    const shippingConfig = this.getShippingConfig();
    const carrierRequest: CarrierShipmentRequest = {
      order_id: req.order_id,
      fulfillment_id: req.fulfillment_id,
      sender: req.sender,
      recipient: req.recipient,
      parcels: req.parcels,
      cod_amount: req.cod_amount,
    };
    let carrierResult: {
      tracking_number: string;
      provider_reference?: string | null;
      label_url?: string | null;
      estimated_delivery?: string | null;
      status?: CarrierShipmentStatus;
      raw?: Record<string, unknown>;
    };
    let source: 'configured_carrier' | 'simulation' | 'manual' = 'configured_carrier';
    let fallbackReason: string | null = null;

    try {
      if (adapter) {
        carrierResult = await adapter.createShipment(carrierRequest, `${req.order_id}:${req.fulfillment_id}`);
      } else if (carrierId === 'own_fleet') {
        source = 'manual';
        carrierResult = this.createSimulationResult(carrier, req, 'manual_own_fleet');
      } else {
        throw new CarrierAdapterError(
          `Carrier ${carrierId} is not configured`,
          'CARRIER_NOT_CONFIGURED',
          false,
        );
      }
    } catch (error) {
      if (!shippingConfig.simulationFallback || carrierId === 'own_fleet') throw error;
      source = 'simulation';
      fallbackReason = error instanceof CarrierAdapterError ? error.code : 'CARRIER_REQUEST_FAILED';
      carrierResult = this.createSimulationResult(carrier, req, fallbackReason);
      logger.warn({ carrier: carrierId, order_id: req.order_id, reason: fallbackReason }, 'Shipment adapter failed; simulation fallback used');
    }

    const id = pdId('ship');

    const status = carrierResult.status || 'created';
    const estimatedDelivery = carrierResult.estimated_delivery || new Date(Date.now() + carrier.sla_hours_max * 60 * 60 * 1000).toISOString();
    const nextSyncAt = nextSyncForStatus(status);
    const metadata = {
      carrier_name: carrier.name,
      cod_amount: req.cod_amount || 0,
      parcels: req.parcels,
      sender: req.sender,
      recipient: req.recipient,
      source,
      fallback_reason: fallbackReason,
      provider_response: carrierResult.raw || null,
    };

    try {
      let wasPending = false;
      await transaction(async (c) => {
        // Lock + read the previous status so ORDER_FULFILLED is emitted only
        // on a genuine pending -> shipped transition (exactly once per fulfillment).
        const { rows: prevRows } = await c.query<{ status: string }>(
          'SELECT status FROM pd_fulfillment WHERE id = $1 AND store_id = $2 FOR UPDATE',
          [req.fulfillment_id, req.store_id],
        );
        wasPending = prevRows[0]?.status === 'pending';

        await c.query(
          `INSERT INTO pd_shipment
            (id, order_id, fulfillment_id, store_id, provider, provider_reference,
             tracking_number, label_url, status, estimated_delivery, next_sync_at, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            id,
            req.order_id,
            req.fulfillment_id,
            req.store_id,
            carrierId,
            carrierResult.provider_reference || null,
            carrierResult.tracking_number,
            carrierResult.label_url || (source === 'configured_carrier' ? null : `/api/pd/shipping/labels/${carrierResult.tracking_number}`),
            status,
            estimatedDelivery,
            nextSyncAt,
            JSON.stringify(metadata),
          ],
        );

        await c.query(
          `UPDATE pd_fulfillment
           SET tracking_number = $2, carrier = $3, status = 'shipped', shipped_at = COALESCE(shipped_at, NOW()), updated_at = NOW()
           WHERE id = $1 AND store_id = $4`,
          [req.fulfillment_id, carrierResult.tracking_number, carrier.name, req.store_id],
        );

        // Propagate the fulfillment change to the order aggregate (canonical rules)
        await syncOrderStatusFromFulfillments(c, req.order_id);

        if (req.cod_amount && req.cod_amount > 0) {
          await c.query(
            `INSERT INTO pd_courier_settlement
              (id, store_id, order_id, carrier, tracking_number, collected_amount, courier_fee, net_payout, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW(), NOW())
             ON CONFLICT (order_id, store_id) DO UPDATE
             SET carrier = EXCLUDED.carrier,
                 tracking_number = EXCLUDED.tracking_number,
                 collected_amount = EXCLUDED.collected_amount,
                 updated_at = NOW()`,
            [
              pdId('cstl'),
              req.store_id,
              req.order_id,
              carrierId,
              carrierResult.tracking_number,
              req.cod_amount,
              carrier.base_rate_tnd,
              Math.max(0, req.cod_amount - carrier.base_rate_tnd),
            ],
          );
        }
      });
      // Post-commit: notify the buyer when the label generation actually
      // transitioned this store's fulfillment to shipped.
      if (wasPending) {
        try {
          eventBus.emit(PdEvent.ORDER_FULFILLED, {
            order_id: req.order_id,
            carrier: carrier.name,
            tracking_number: carrierResult.tracking_number,
          });
        } catch (err) {
          logger.error({ err, order_id: req.order_id }, 'ORDER_FULFILLED emission failed');
        }
      }
    } catch (error) {
      if (adapter && source === 'configured_carrier') {
        await adapter.cancelShipment(carrierResult.tracking_number, 'PandaMarket database persistence failed').catch((cancelError) => {
          logger.error({ carrier: carrierId, tracking: carrierResult.tracking_number, err: cancelError }, 'Carrier compensation cancellation failed');
        });
      }
      throw error;
    }

    logger.info(
      { shipment_id: id, tracking: carrierResult.tracking_number, carrier: carrier.name, source },
      'Shipment created',
    );

    return {
      id,
      tracking_number: carrierResult.tracking_number,
      provider: carrierId,
      carrier_name: carrier.name,
      label_url: carrierResult.label_url || (source === 'configured_carrier' ? null : `/api/pd/shipping/labels/${carrierResult.tracking_number}`),
      estimated_delivery: estimatedDelivery,
      status,
      provider_reference: carrierResult.provider_reference || null,
      source,
      fallback_reason: fallbackReason,
    };
  }

  private createSimulationResult(
    carrier: CarrierInfo,
    req: ShipmentRequest,
    reason: string,
  ): {
    tracking_number: string;
    provider_reference: string;
    label_url: string;
    estimated_delivery: string;
    status: CarrierShipmentStatus;
    raw: Record<string, unknown>;
  } {
    const trackingNumber = `${carrier.tracking_prefix}-${randomInt(10_000_000, 100_000_000)}`;
    const estimatedDelivery = new Date(Date.now() + carrier.sla_hours_max * 60 * 60 * 1000).toISOString();
    return {
      tracking_number: trackingNumber,
      provider_reference: `sim-${req.order_id}-${req.fulfillment_id}`,
      label_url: `/api/pd/shipping/labels/${trackingNumber}`,
      estimated_delivery: estimatedDelivery,
      status: 'created',
      raw: { simulation: true, reason },
    };
  }

  /**
   * Track a shipment through the configured carrier. Development simulation
   * remains deterministic and is clearly marked in the response/metadata.
   */
  async track(trackingNumber: string): Promise<TrackingInfo> {
    const { rows } = await query<{
      id: string;
      provider: string;
      status: string;
      tracking_number: string;
      estimated_delivery: string | null;
      created_at: Date;
      metadata?: Record<string, unknown>;
    }>(
      'SELECT id, provider, status, tracking_number, estimated_delivery, created_at, metadata FROM pd_shipment WHERE tracking_number = $1 LIMIT 1',
      [trackingNumber],
    );
    const shipment = rows[0];
    if (!shipment) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Shipment not found');

    const carrierId = normalizeCarrierId(shipment.provider as CarrierId);
    const carrier = TUNISIAN_CARRIERS.find((candidate) => candidate.id === carrierId) || TUNISIAN_CARRIERS[0];
    const adapter = this.getAdapter(carrierId);
    let result: CarrierTrackingResult;
    let source: 'configured_carrier' | 'simulation' = 'configured_carrier';

    try {
      if (adapter) {
        result = await adapter.track(shipment.tracking_number);
      } else if (this.getShippingConfig().simulationFallback || carrierId === 'own_fleet') {
        source = 'simulation';
        result = this.createSimulationTracking(shipment, carrier);
      } else {
        throw new CarrierAdapterError(`Carrier ${carrierId} is not configured`, 'CARRIER_NOT_CONFIGURED');
      }
    } catch (error) {
      if (!this.getShippingConfig().simulationFallback) throw error;
      source = 'simulation';
      result = this.createSimulationTracking(shipment, carrier);
      logger.warn({ carrier: carrierId, tracking: shipment.tracking_number, err: error }, 'Carrier tracking failed; simulation fallback used');
    }

    await this.persistTrackingResult(shipment.id, result, source);
    return {
      tracking_number: result.tracking_number,
      provider: carrierId,
      carrier_name: carrier.name,
      status: result.status,
      events: result.events.map((event) => ({
        timestamp: event.timestamp,
        location: event.location || '',
        description: event.description || '',
        status: event.status,
      })),
      estimated_delivery: result.estimated_delivery || shipment.estimated_delivery || null,
      source,
    };
  }

  private createSimulationTracking(
    shipment: { tracking_number: string; status: string; created_at: Date },
    carrier: CarrierInfo,
  ): CarrierTrackingResult {
    const createdAt = new Date(shipment.created_at);
    const timestamps = [0, 4, 18, 26].map((hours) => new Date(createdAt.getTime() + hours * 3600 * 1000).toISOString());
    const events: CarrierTrackingEvent[] = [
      { provider_event_id: `simulation-created-${shipment.tracking_number}`, timestamp: timestamps[0], location: 'Centre expéditeur', description: `AWB créé — ${carrier.name}`, status: 'created' },
      { provider_event_id: `simulation-picked-${shipment.tracking_number}`, timestamp: timestamps[1], location: 'Hub régional', description: `Colis remis à ${carrier.name}`, status: 'picked_up' },
      { provider_event_id: `simulation-transit-${shipment.tracking_number}`, timestamp: timestamps[2], location: 'Centre de tri', description: 'Colis en transit', status: 'in_transit' },
      { provider_event_id: `simulation-out-${shipment.tracking_number}`, timestamp: timestamps[3], location: 'Secteur de livraison', description: 'Colis en cours de livraison', status: 'out_for_delivery' },
    ];
    const currentStatus = normalizePersistedShipmentStatus(shipment.status);
    if (currentStatus === 'delivered') {
      events.push({
        provider_event_id: `simulation-delivered-${shipment.tracking_number}`,
        timestamp: new Date(createdAt.getTime() + 30 * 3600 * 1000).toISOString(),
        location: 'Adresse destinataire',
        description: 'Colis livré',
        status: 'delivered',
      });
    } else if (currentStatus === 'returned' || currentStatus === 'cancelled') {
      events.push({
        provider_event_id: `simulation-terminal-${shipment.tracking_number}`,
        timestamp: new Date().toISOString(),
        location: 'Centre expéditeur',
        description: currentStatus === 'returned' ? 'Colis retourné à l’expéditeur' : 'Expédition annulée',
        status: currentStatus,
      });
    }
    return {
      tracking_number: shipment.tracking_number,
      status: currentStatus || 'in_transit',
      estimated_delivery: new Date(createdAt.getTime() + carrier.sla_hours_max * 3600 * 1000).toISOString(),
      events,
    };
  }

  private async persistTrackingResult(
    shipmentId: string,
    result: CarrierTrackingResult,
    source: 'configured_carrier' | 'simulation',
  ): Promise<void> {
    const nextSyncAt = nextSyncForStatus(result.status);
    const mappedStatus = mapTrackingStatus(result.status);
    let codCapturedOrderId: string | null = null;
    let notifyShippedOrderId: string | null = null;
    let notifyShippedCarrier: string | null = null;
    let notifyShippedTracking: string | null = null;
    await transaction(async (client) => {
      for (const [index, event] of result.events.entries()) {
        const providerEventId = event.provider_event_id || `${source}-${result.tracking_number}-${index}-${event.timestamp}`;
        await client.query(
          `INSERT INTO pd_shipment_event
             (id, shipment_id, provider_event_id, status, location, description, occurred_at, source, raw_payload)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
           ON CONFLICT (shipment_id, provider_event_id) DO NOTHING`,
          [
            pdId('shevt'),
            shipmentId,
            providerEventId,
            event.status,
            event.location || null,
            event.description || null,
            safeDate(event.timestamp) || new Date(),
            source,
            JSON.stringify(event.raw || {}),
          ],
        );
      }
      await client.query(
        `UPDATE pd_shipment
         SET status = $2,
             estimated_delivery = COALESCE($3, estimated_delivery),
             delivered_at = CASE WHEN $2 = 'delivered' THEN COALESCE(delivered_at, NOW()) ELSE delivered_at END,
             last_synced_at = NOW(),
             next_sync_at = $4,
             sync_attempts = 0,
             last_sync_error = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [shipmentId, mappedStatus, result.estimated_delivery ? safeDate(result.estimated_delivery) : null, nextSyncAt],
      );
      // Capture the pre-update fulfillment status to detect a genuine
      // pending -> shipped transition (exactly-once ORDER_FULFILLED emission).
      const { rows: prevFulfillmentRows } = await client.query<{ status: string }>(
        `SELECT f.status FROM pd_fulfillment f
         WHERE f.id = (SELECT fulfillment_id FROM pd_shipment WHERE id = $1)`,
        [shipmentId],
      );
      const prevFulfillmentStatus = prevFulfillmentRows[0]?.status ?? null;
      await client.query(
        `UPDATE pd_fulfillment
         SET status = CASE
               WHEN $2 = 'delivered' THEN 'delivered'
               WHEN $2 IN ('cancelled', 'returned') THEN 'cancelled'
               ELSE CASE WHEN status = 'pending' THEN 'shipped' ELSE status END
             END,
             rto_reason_code = CASE WHEN $2 = 'returned' THEN COALESCE(rto_reason_code, 'carrier_returned') ELSE rto_reason_code END,
             rto_at = CASE WHEN $2 = 'returned' THEN COALESCE(rto_at, NOW()) ELSE rto_at END,
             delivered_at = CASE WHEN $2 = 'delivered' THEN COALESCE(delivered_at, NOW()) ELSE delivered_at END,
             updated_at = NOW()
         WHERE id = (SELECT fulfillment_id FROM pd_shipment WHERE id = $1)`,
        [shipmentId, mappedStatus],
      );

      // Propagate the fulfillment change to the order aggregate (canonical rules)
      const { rows: shipmentRows } = await client.query<{ order_id: string; store_id: string; provider: string }>(
        'SELECT order_id, store_id, provider FROM pd_shipment WHERE id = $1',
        [shipmentId],
      );
      const shipment = shipmentRows[0];
      if (shipment) {
        if (mappedStatus === 'delivered') {
          await syncOrderStatusFromFulfillments(client, shipment.order_id);
          // COD is considered paid only after every store fulfillment is delivered.
          const { rowCount } = await client.query(
            `UPDATE pd_order SET payment_status = 'captured', updated_at = NOW()
             WHERE id = $1 AND payment_gateway = 'cod' AND payment_status != 'captured'
               AND status NOT IN ('cancelled','refunded')
               AND EXISTS (SELECT 1 FROM pd_fulfillment WHERE order_id = $1 AND status = 'delivered')
               AND NOT EXISTS (SELECT 1 FROM pd_fulfillment WHERE order_id = $1 AND status IN ('pending','shipped'))`,
            [shipment.order_id],
          );
          if (rowCount) codCapturedOrderId = shipment.order_id;
        } else if (mappedStatus === 'cancelled' || mappedStatus === 'returned') {
          // Carrier-side cancellation/return: restock this store's items and
          // flag the courier settlement for reconciliation, then recompute.
          const { rows: items } = await client.query<{
            product_id: string;
            variant_id: string | null;
            quantity: number;
            product_type: ProductType;
          }>(
            `SELECT i.product_id, i.variant_id, i.quantity, p.type AS product_type
             FROM pd_order_item i
             JOIN pd_product p ON p.id = i.product_id
             WHERE i.order_id = $1 AND i.store_id = $2`,
            [shipment.order_id, shipment.store_id],
          );
          for (const item of items) {
            await restoreOrderItemStock(client, item);
          }
          await client.query(
            `UPDATE pd_courier_settlement
             SET status = 'disputed', updated_at = NOW()
             WHERE order_id = $1 AND store_id = $2`,
            [shipment.order_id, shipment.store_id],
          );
          await syncOrderStatusFromFulfillments(client, shipment.order_id, {
            cancelReason: `carrier_${mappedStatus}`,
          });
        } else {
          await syncOrderStatusFromFulfillments(client, shipment.order_id);
        }
        // A genuine pending -> shipped transition via carrier sync also
        // notifies the buyer (exactly once per fulfillment).
        if (
          prevFulfillmentStatus === 'pending'
          && mappedStatus !== 'delivered'
          && mappedStatus !== 'cancelled'
          && mappedStatus !== 'returned'
        ) {
          notifyShippedOrderId = shipment.order_id;
          notifyShippedCarrier = shipment.provider;
          notifyShippedTracking = result.tracking_number;
        }
      }
    });
    // Post-commit: run the same COD capture side effects as the manual delivery path
    if (codCapturedOrderId) {
      await adsService.recognizeOrderConversion(codCapturedOrderId);
      const { rows: capturedRows } = await query<{ total: string }>(
        'SELECT total::text FROM pd_order WHERE id = $1',
        [codCapturedOrderId],
      );
      if (capturedRows[0]) {
        await eventBus.emit(PdEvent.PAYMENT_CAPTURED, {
          order_id: codCapturedOrderId,
          gateway: 'cod',
          amount: parseFloat(capturedRows[0].total),
          currency: 'TND',
          source: 'cod_carrier_delivery',
        });
      }
    }
    // Post-commit: notify the buyer of the shipment when carrier sync
    // transitioned the fulfillment pending -> shipped.
    if (notifyShippedOrderId) {
      try {
        eventBus.emit(PdEvent.ORDER_FULFILLED, {
          order_id: notifyShippedOrderId,
          carrier: notifyShippedCarrier,
          tracking_number: notifyShippedTracking,
        });
      } catch (err) {
        logger.error({ err, order_id: notifyShippedOrderId }, 'ORDER_FULFILLED emission failed');
      }
    }
  }

  async cancelShipment(shipmentId: string, reason?: string, storeId?: string): Promise<ShipmentResult> {
    const { rows } = await query<{
      id: string;
      order_id: string;
      fulfillment_id: string | null;
      provider: string;
      provider_reference: string | null;
      tracking_number: string;
      label_url: string | null;
      status: string;
      estimated_delivery: Date | string | null;
      metadata: Record<string, unknown> | null;
    }>(
      `SELECT * FROM pd_shipment
       WHERE id = $1 ${storeId ? 'AND store_id = $2' : ''}
       LIMIT 1`,
      storeId ? [shipmentId, storeId] : [shipmentId],
    );
    const shipment = rows[0];
    if (!shipment) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Shipment not found');
    if (shipment.status === 'delivered') throw new PdValidationError('Delivered shipments cannot be cancelled');
    if (shipment.status === 'cancelled') return this.toShipmentResult(shipment, shipment.metadata?.source);

    const carrierId = normalizeCarrierId(shipment.provider as CarrierId);
    const adapter = this.getAdapter(carrierId);
    if (adapter) {
      await adapter.cancelShipment(shipment.tracking_number, reason);
    } else if (!this.getShippingConfig().simulationFallback && carrierId !== 'own_fleet') {
      throw new CarrierAdapterError(`Carrier ${carrierId} is not configured`, 'CARRIER_NOT_CONFIGURED');
    }

    await transaction(async (client) => {
      await client.query(
        `UPDATE pd_shipment
         SET status = 'cancelled', cancellation_reason = $2,
             cancellation_requested_at = COALESCE(cancellation_requested_at, NOW()),
             cancelled_at = NOW(), next_sync_at = NULL, updated_at = NOW()
         WHERE id = $1`,
        [shipmentId, reason || null],
      );
      if (shipment.fulfillment_id) {
        await client.query(
          `UPDATE pd_fulfillment SET status = 'cancelled', updated_at = NOW() WHERE id = $1 AND status <> 'delivered'`,
          [shipment.fulfillment_id],
        );
        // Propagate the fulfillment cancellation to the order aggregate
        await syncOrderStatusFromFulfillments(client, shipment.order_id, {
          cancelReason: reason || 'shipment_cancelled',
        });
      }
    });

    return this.toShipmentResult({ ...shipment, status: 'cancelled', metadata: shipment.metadata || {} }, shipment.metadata?.source);
  }

  private toShipmentResult(
    shipment: {
      id: string;
      provider: string;
      tracking_number: string;
      label_url: string | null;
      estimated_delivery: Date | string | null;
      status: string;
      provider_reference?: string | null;
      metadata?: Record<string, unknown> | null;
    },
    source?: unknown,
  ): ShipmentResult {
    const carrier = TUNISIAN_CARRIERS.find((candidate) => candidate.id === normalizeCarrierId(shipment.provider as CarrierId)) || TUNISIAN_CARRIERS[0];
    return {
      id: shipment.id,
      tracking_number: shipment.tracking_number,
      provider: normalizeCarrierId(shipment.provider as CarrierId),
      carrier_name: carrier.name,
      label_url: shipment.label_url,
      estimated_delivery: shipment.estimated_delivery ? new Date(shipment.estimated_delivery).toISOString() : null,
      status: normalizePersistedShipmentStatus(shipment.status),
      provider_reference: shipment.provider_reference || null,
      source: source === 'configured_carrier'
        ? 'configured_carrier'
        : source === 'manual' || normalizeCarrierId(shipment.provider as CarrierId) === 'own_fleet'
          ? 'manual'
          : 'simulation',
    };
  }

  async syncShipment(shipmentId: string): Promise<TrackingInfo> {
    const { rows } = await query<{ tracking_number: string }>('SELECT tracking_number FROM pd_shipment WHERE id = $1 LIMIT 1', [shipmentId]);
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Shipment not found');
    return this.track(rows[0].tracking_number);
  }

  async handleCarrierWebhook(
    provider: CarrierId,
    rawBody: Buffer,
    signature: string | undefined,
    payload: unknown,
  ): Promise<{ shipment_id: string; status: string }> {
    const carrierId = normalizeCarrierId(provider);
    const adapter = this.getAdapter(carrierId);
    if (!adapter || !adapter.verifyWebhook(rawBody, signature)) {
      throw new CarrierAdapterError('Invalid carrier webhook signature or provider configuration', 'CARRIER_WEBHOOK_INVALID');
    }
    const event = adapter.parseWebhook(payload);
    if (!event) throw new CarrierAdapterError('Carrier webhook did not include a tracking number', 'CARRIER_INVALID_RESPONSE');

    const { rows } = await query<{ id: string }>(
      'SELECT id FROM pd_shipment WHERE provider = $1 AND tracking_number = $2 ORDER BY created_at DESC LIMIT 1',
      [carrierId, event.tracking_number],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Shipment not found for carrier webhook');
    await this.persistTrackingResult(rows[0].id, event, 'configured_carrier');
    return { shipment_id: rows[0].id, status: event.status };
  }

  async reconcileDueShipments(): Promise<{ attempted: number; succeeded: number; failed: number }> {
    const { rows } = await query<{ id: string }>(
      `SELECT id
       FROM pd_shipment
       WHERE status IN ('created', 'picked_up', 'in_transit', 'out_for_delivery')
         AND next_sync_at IS NOT NULL AND next_sync_at <= NOW()
       ORDER BY next_sync_at ASC
       LIMIT 50`,
    );
    let succeeded = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        await this.syncShipment(row.id);
        await query(
          `INSERT INTO pd_shipment_reconciliation (id, shipment_id, action, status, attempt_count, resolved_at, updated_at)
           VALUES ($1, $2, 'tracking_sync', 'resolved', 1, NOW(), NOW())
           ON CONFLICT (shipment_id, action) DO UPDATE
           SET status = 'resolved', attempt_count = pd_shipment_reconciliation.attempt_count + 1,
               last_error = NULL, resolved_at = NOW(), updated_at = NOW()`,
          [pdId('shrec'), row.id],
        );
        succeeded++;
      } catch (error) {
        await query(
          `INSERT INTO pd_shipment_reconciliation (id, shipment_id, action, status, attempt_count, next_attempt_at, last_error, updated_at)
           VALUES ($1, $2, 'tracking_sync', 'retry', 1, NOW() + INTERVAL '15 minutes', $3, NOW())
           ON CONFLICT (shipment_id, action) DO UPDATE
           SET status = 'retry', attempt_count = pd_shipment_reconciliation.attempt_count + 1,
               next_attempt_at = NOW() + INTERVAL '15 minutes', last_error = $3, updated_at = NOW()`,
          [pdId('shrec'), row.id, error instanceof Error ? error.message.slice(0, 500) : 'tracking sync failed'],
        );
        await query(
          `UPDATE pd_shipment SET sync_attempts = sync_attempts + 1, last_sync_error = $2, next_sync_at = NOW() + INTERVAL '15 minutes', updated_at = NOW() WHERE id = $1`,
          [row.id, error instanceof Error ? error.message.slice(0, 500) : 'tracking sync failed'],
        );
        failed++;
      }
    }
    return { attempted: rows.length, succeeded, failed };
  }

  /**
   * Request a pickup from the shipping provider.
   */
  async requestPickup(opts: {
    store_id: string;
    shipment_ids: string[];
    pickup_date: string;
    pickup_address: IAddress;
    contact_name: string;
    contact_phone: string;
  }): Promise<{ pickup_id: string; confirmation: string }> {
    const pickupId = pdId('pickup');

    await query(
      `INSERT INTO pd_pickup_request
        (id, store_id, shipment_ids, pickup_date, pickup_address, contact_name, contact_phone, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'requested')`,
      [
        pickupId,
        opts.store_id,
        JSON.stringify(opts.shipment_ids),
        opts.pickup_date,
        JSON.stringify(opts.pickup_address),
        opts.contact_name,
        opts.contact_phone,
      ],
    );

    logger.info({ pickup_id: pickupId, store_id: opts.store_id }, 'Pickup requested');

    return {
      pickup_id: pickupId,
      confirmation: `Enlèvement programmé pour le ${opts.pickup_date}. Réf: ${pickupId}`,
    };
  }
}

export const shippingService = new ShippingService();
