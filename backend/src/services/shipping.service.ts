/**
 * ShippingService — shipping rate calculation, AWB generation, and tracking.
 *
 * Supports:
 *   - Aramex API integration for automated shipping
 *   - La Poste TN (manual fallback with PDF label generation)
 *   - Self-managed mode (vendor handles their own shipping)
 *
 * Per the PRD §7, vendors can choose between:
 *   1. Self-managed: vendor handles their own logistics
 *   2. Platform unified: Aramex / La Poste TN integration
 */

import { query } from '../db/pool';
import { pdId } from '../utils/crypto';
import { config } from '../config';
import { logger } from '../utils/logger';
import {
  PdNotFoundError,
  PdValidationError,
  PdInternalError,
  PdErrorCode,
} from '../errors';
import { IAddress } from '@pandamarket/types';

// =====================================================
// Types
// =====================================================

export interface ShippingRateRequest {
  origin_city: string;
  origin_country?: string;
  destination: IAddress;
  weight_kg: number;
  dimensions?: { length_cm: number; width_cm: number; height_cm: number };
  provider?: 'aramex' | 'laposte' | 'auto';
}

export interface ShippingRate {
  provider: string;
  service_type: string;
  estimated_days: number;
  price_tnd: number;
  currency: string;
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
  provider?: 'aramex' | 'laposte';
  cod_amount?: number;
}

export interface ShipmentResult {
  id: string;
  tracking_number: string;
  provider: string;
  label_url: string | null;
  estimated_delivery: string | null;
  status: string;
}

export interface TrackingInfo {
  tracking_number: string;
  provider: string;
  status: string;
  events: Array<{
    timestamp: string;
    location: string;
    description: string;
    status: string;
  }>;
  estimated_delivery: string | null;
}

// =====================================================
// Aramex API Client (simplified)
// =====================================================

const ARAMEX_CONFIG = {
  baseUrl: process.env.PD_ARAMEX_BASE_URL || 'https://ws.aramex.net/ShippingAPI.V2',
  username: process.env.PD_ARAMEX_USERNAME || '',
  password: process.env.PD_ARAMEX_PASSWORD || '',
  accountNumber: process.env.PD_ARAMEX_ACCOUNT_NUMBER || '',
  accountPin: process.env.PD_ARAMEX_ACCOUNT_PIN || '',
  accountEntity: process.env.PD_ARAMEX_ACCOUNT_ENTITY || '',
  accountCountry: process.env.PD_ARAMEX_ACCOUNT_COUNTRY || 'TN',
};

function getAramexClientInfo() {
  return {
    UserName: ARAMEX_CONFIG.username,
    Password: ARAMEX_CONFIG.password,
    Version: 'v2',
    AccountNumber: ARAMEX_CONFIG.accountNumber,
    AccountPin: ARAMEX_CONFIG.accountPin,
    AccountEntity: ARAMEX_CONFIG.accountEntity,
    AccountCountryCode: ARAMEX_CONFIG.accountCountry,
  };
}

// =====================================================
// Service
// =====================================================

export class ShippingService {
  /**
   * Calculate shipping rates for a given origin → destination.
   * Returns rates from available providers.
   */
  async calculateRates(req: ShippingRateRequest): Promise<ShippingRate[]> {
    const rates: ShippingRate[] = [];
    const provider = req.provider ?? 'auto';

    if (provider === 'aramex' || provider === 'auto') {
      try {
        const aramexRate = await this.getAramexRate(req);
        if (aramexRate) rates.push(aramexRate);
      } catch (err) {
        logger.warn({ err }, 'Aramex rate calculation failed, falling back');
      }
    }

    if (provider === 'laposte' || provider === 'auto') {
      // La Poste TN — flat rate based on weight (no stable API)
      rates.push(this.getLaPosteRate(req));
    }

    // Always include a fallback flat rate
    if (rates.length === 0) {
      rates.push({
        provider: 'platform',
        service_type: 'standard',
        estimated_days: 5,
        price_tnd: 7.0,
        currency: 'TND',
      });
    }

    return rates;
  }

  /**
   * Create a shipment and generate an AWB (Air Waybill).
   */
  async createShipment(req: ShipmentRequest): Promise<ShipmentResult> {
    const provider = req.provider ?? 'aramex';
    const id = pdId('ship');

    let trackingNumber: string;
    let labelUrl: string | null = null;
    let estimatedDelivery: string | null = null;

    if (provider === 'aramex' && ARAMEX_CONFIG.username) {
      const result = await this.createAramexShipment(req);
      trackingNumber = result.tracking_number;
      labelUrl = result.label_url;
      estimatedDelivery = result.estimated_delivery;
    } else {
      // Manual / La Poste fallback — generate a reference number
      trackingNumber = `PD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      estimatedDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    }

    // Store shipment in database
    await query(
      `INSERT INTO pd_shipment
        (id, order_id, fulfillment_id, store_id, provider, tracking_number, label_url, status, estimated_delivery)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'created', $8)`,
      [id, req.order_id, req.fulfillment_id, req.store_id, provider, trackingNumber, labelUrl, estimatedDelivery],
    );

    // Update fulfillment with tracking number
    await query(
      `UPDATE pd_fulfillment SET tracking_number = $2 WHERE id = $1`,
      [req.fulfillment_id, trackingNumber],
    );

    logger.info(
      { shipment_id: id, tracking: trackingNumber, provider },
      'Shipment created',
    );

    return {
      id,
      tracking_number: trackingNumber,
      provider,
      label_url: labelUrl,
      estimated_delivery: estimatedDelivery,
      status: 'created',
    };
  }

  /**
   * Track a shipment by tracking number.
   */
  async track(trackingNumber: string): Promise<TrackingInfo> {
    // First check our database
    const { rows } = await query<{
      id: string;
      provider: string;
      status: string;
      tracking_number: string;
      estimated_delivery: string | null;
    }>(
      'SELECT * FROM pd_shipment WHERE tracking_number = $1',
      [trackingNumber],
    );

    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Shipment not found', {
        tracking_number: trackingNumber,
      });
    }

    const shipment = rows[0];

    // Try to get live tracking from Aramex
    if (shipment.provider === 'aramex' && ARAMEX_CONFIG.username) {
      try {
        return await this.trackAramex(trackingNumber);
      } catch (err) {
        logger.warn({ err, tracking: trackingNumber }, 'Aramex tracking failed');
      }
    }

    // Return database-based tracking info
    return {
      tracking_number: trackingNumber,
      provider: shipment.provider,
      status: shipment.status,
      events: [
        {
          timestamp: new Date().toISOString(),
          location: 'Tunisia',
          description: `Shipment ${shipment.status}`,
          status: shipment.status,
        },
      ],
      estimated_delivery: shipment.estimated_delivery,
    };
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

    // Store pickup request
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
      confirmation: `Pickup scheduled for ${opts.pickup_date}. Reference: ${pickupId}`,
    };
  }

  // ----------------------------------------------------------------
  // Aramex API methods
  // ----------------------------------------------------------------

  private async getAramexRate(req: ShippingRateRequest): Promise<ShippingRate | null> {
    if (!ARAMEX_CONFIG.username) return null;

    try {
      const response = await fetch(`${ARAMEX_CONFIG.baseUrl}/RateCalculator/Service_1_0.svc/json/CalculateRate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ClientInfo: getAramexClientInfo(),
          OriginAddress: {
            City: req.origin_city,
            CountryCode: req.origin_country ?? 'TN',
          },
          DestinationAddress: {
            City: req.destination.city,
            CountryCode: req.destination.country ?? 'TN',
          },
          ShipmentDetails: {
            PaymentType: 'P',
            ProductGroup: 'DOM',
            ProductType: 'ONP',
            ActualWeight: { Unit: 'KG', Value: req.weight_kg },
            NumberOfPieces: 1,
          },
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) return null;

      const data = await response.json() as {
        TotalAmount?: { Value?: number };
        HasErrors?: boolean;
      };

      if (data.HasErrors || !data.TotalAmount?.Value) return null;

      return {
        provider: 'aramex',
        service_type: 'express',
        estimated_days: 2,
        price_tnd: data.TotalAmount.Value,
        currency: 'TND',
      };
    } catch {
      return null;
    }
  }

  private getLaPosteRate(req: ShippingRateRequest): ShippingRate {
    // La Poste TN flat rate schedule (approximate)
    let price: number;
    if (req.weight_kg <= 0.5) price = 4.5;
    else if (req.weight_kg <= 1) price = 6.0;
    else if (req.weight_kg <= 2) price = 8.0;
    else if (req.weight_kg <= 5) price = 12.0;
    else price = 12.0 + (req.weight_kg - 5) * 2.0;

    return {
      provider: 'laposte',
      service_type: 'standard',
      estimated_days: 4,
      price_tnd: Math.round(price * 1000) / 1000,
      currency: 'TND',
    };
  }

  private async createAramexShipment(req: ShipmentRequest): Promise<{
    tracking_number: string;
    label_url: string | null;
    estimated_delivery: string | null;
  }> {
    const response = await fetch(`${ARAMEX_CONFIG.baseUrl}/Shipping/Service_1_0.svc/json/CreateShipments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ClientInfo: getAramexClientInfo(),
        Shipments: [
          {
            Shipper: {
              Reference1: req.order_id,
              AccountNumber: ARAMEX_CONFIG.accountNumber,
              PartyAddress: {
                Line1: req.sender.address.line1,
                City: req.sender.address.city,
                CountryCode: req.sender.address.country ?? 'TN',
                PostCode: req.sender.address.postal_code ?? '',
              },
              Contact: {
                PersonName: req.sender.name,
                PhoneNumber1: req.sender.phone,
              },
            },
            Consignee: {
              Reference1: req.fulfillment_id,
              PartyAddress: {
                Line1: req.recipient.address.line1,
                City: req.recipient.address.city,
                CountryCode: req.recipient.address.country ?? 'TN',
                PostCode: req.recipient.address.postal_code ?? '',
              },
              Contact: {
                PersonName: req.recipient.name,
                PhoneNumber1: req.recipient.phone,
                EmailAddress: req.recipient.email ?? '',
              },
            },
            Details: {
              ActualWeight: { Unit: 'KG', Value: req.parcels[0]?.weight_kg ?? 1 },
              NumberOfPieces: req.parcels.length,
              ProductGroup: 'DOM',
              ProductType: 'ONP',
              PaymentType: 'P',
              DescriptionOfGoods: req.parcels[0]?.description ?? 'E-commerce package',
              ...(req.cod_amount ? { CashOnDeliveryAmount: { CurrencyCode: 'TND', Value: req.cod_amount } } : {}),
            },
          },
        ],
        LabelInfo: { ReportID: 9201, ReportType: 'URL' },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new PdInternalError('Aramex shipment creation failed');
    }

    const data = await response.json() as {
      HasErrors?: boolean;
      Shipments?: Array<{ ID?: string; ShipmentLabel?: { LabelURL?: string } }>;
    };

    if (data.HasErrors || !data.Shipments?.[0]?.ID) {
      throw new PdInternalError('Aramex returned an error');
    }

    return {
      tracking_number: data.Shipments[0].ID,
      label_url: data.Shipments[0].ShipmentLabel?.LabelURL ?? null,
      estimated_delivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  private async trackAramex(trackingNumber: string): Promise<TrackingInfo> {
    const response = await fetch(`${ARAMEX_CONFIG.baseUrl}/Tracking/Service_1_0.svc/json/TrackShipments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ClientInfo: getAramexClientInfo(),
        Shipments: [trackingNumber],
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new PdInternalError('Aramex tracking request failed');
    }

    const data = await response.json() as {
      TrackingResults?: Array<{
        Value?: Array<{
          UpdateDateTime?: string;
          UpdateLocation?: string;
          UpdateDescription?: string;
          UpdateCode?: string;
        }>;
      }>;
    };

    const events = (data.TrackingResults?.[0]?.Value ?? []).map((e) => ({
      timestamp: e.UpdateDateTime ?? new Date().toISOString(),
      location: e.UpdateLocation ?? 'Unknown',
      description: e.UpdateDescription ?? '',
      status: e.UpdateCode ?? 'unknown',
    }));

    return {
      tracking_number: trackingNumber,
      provider: 'aramex',
      status: events[0]?.status ?? 'unknown',
      events,
      estimated_delivery: null,
    };
  }
}

export const shippingService = new ShippingService();
