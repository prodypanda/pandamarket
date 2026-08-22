import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IAddress } from '@pandamarket/types';

export type CarrierId =
  | 'aramex'
  | 'laposte_rapid'
  | 'laposte'
  | 'first_delivery'
  | 'runex'
  | 'fleex'
  | 'own_fleet';

export type CarrierShipmentStatus =
  | 'created'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface CarrierParcel {
  weight_kg: number;
  description: string;
  quantity?: number;
}

export interface CarrierShipmentRequest {
  order_id: string;
  fulfillment_id: string;
  sender: { name: string; phone: string; address: IAddress };
  recipient: { name: string; phone: string; email?: string; address: IAddress };
  parcels: CarrierParcel[];
  cod_amount?: number;
}

export interface CarrierRateRequest {
  origin_city: string;
  destination: IAddress;
  weight_kg: number;
  cod_amount?: number;
}

export interface CarrierRate {
  price_tnd: number;
  cod_fee_tnd?: number;
  service_type?: string;
  estimated_hours_min?: number;
  estimated_hours_max?: number;
  estimated_delivery?: string | null;
  currency?: string;
}

export interface CarrierShipmentResult {
  tracking_number: string;
  provider_reference?: string | null;
  label_url?: string | null;
  estimated_delivery?: string | null;
  status?: CarrierShipmentStatus;
  raw?: Record<string, unknown>;
}

export interface CarrierTrackingEvent {
  provider_event_id?: string | null;
  timestamp: string;
  location?: string | null;
  description?: string | null;
  status: CarrierShipmentStatus;
  raw?: Record<string, unknown>;
}

export interface CarrierTrackingResult {
  tracking_number: string;
  status: CarrierShipmentStatus;
  estimated_delivery?: string | null;
  events: CarrierTrackingEvent[];
  raw?: Record<string, unknown>;
}

export interface CarrierWebhookEvent {
  event_id?: string | null;
  tracking_number: string;
  status: CarrierShipmentStatus;
  estimated_delivery?: string | null;
  events: CarrierTrackingEvent[];
  raw: Record<string, unknown>;
}

export interface CarrierHealth {
  ok: boolean;
  latency_ms: number;
  error?: string;
}

export interface CarrierAdapter {
  readonly id: CarrierId;
  readonly mode: 'http';
  readonly configured: true;
  getRates(request: CarrierRateRequest): Promise<CarrierRate | null>;
  createShipment(request: CarrierShipmentRequest, idempotencyKey: string): Promise<CarrierShipmentResult>;
  cancelShipment(trackingNumber: string, reason?: string): Promise<void>;
  track(trackingNumber: string): Promise<CarrierTrackingResult>;
  checkHealth(): Promise<CarrierHealth>;
  verifyWebhook(rawBody: Buffer, signature: string | undefined): boolean;
  parseWebhook(payload: unknown): CarrierWebhookEvent | null;
}

export class CarrierAdapterError extends Error {
  constructor(
    message: string,
    public readonly code: 'CARRIER_NOT_CONFIGURED' | 'CARRIER_REQUEST_FAILED' | 'CARRIER_INVALID_RESPONSE' | 'CARRIER_WEBHOOK_INVALID',
    public readonly retryable = false,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'CarrierAdapterError';
  }
}

export interface HttpCarrierAdapterOptions {
  id: CarrierId;
  baseUrl: string;
  apiKey: string;
  /** Provider-specific auth header. Defaults to Authorization. */
  apiKeyHeader?: string;
  /** Provider-specific auth prefix. Set to an empty string for raw API keys. */
  apiKeyPrefix?: string;
  webhookSecret?: string;
  timeoutMs: number;
  maxAttempts: number;
  ratesPath: string;
  createPath: string;
  trackingPath: string;
  cancelPath: string;
  healthPath?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function nestedRecord(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  if (!record) return {};
  return asRecord(record.data) || asRecord(record.result) || record;
}

function stringValue(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

function numberValue(record: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = Number(record[key]);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function normalizeStatus(value: unknown): CarrierShipmentStatus {
  const status = String(value || '').trim().toLowerCase().replace(/[ -]+/g, '_');
  if (status.includes('deliver')) return 'delivered';
  if (status.includes('return') || status.includes('rto')) return 'returned';
  if (status.includes('cancel')) return 'cancelled';
  if (status.includes('out_for') || status.includes('outfordelivery')) return 'out_for_delivery';
  if (status.includes('transit') || status.includes('dispatch') || status.includes('shipping')) return 'in_transit';
  if (status.includes('pickup') || status.includes('collect')) return 'picked_up';
  return 'created';
}

function parseEvents(value: unknown): CarrierTrackingEvent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    const event = asRecord(item);
    if (!event) return [];
    const timestamp = stringValue(event, 'timestamp', 'occurred_at', 'occurredAt', 'date', 'created_at') || new Date().toISOString();
    return [{
      provider_event_id: stringValue(event, 'id', 'event_id', 'eventId') || `event-${index}-${timestamp}`,
      timestamp,
      location: stringValue(event, 'location', 'city', 'facility'),
      description: stringValue(event, 'description', 'message', 'status_text'),
      status: normalizeStatus(event.status || event.code),
      raw: event,
    }];
  });
}

export class HttpCarrierAdapter implements CarrierAdapter {
  readonly mode = 'http' as const;
  readonly configured = true as const;

  constructor(private readonly options: HttpCarrierAdapterOptions) {}

  get id(): CarrierId {
    return this.options.id;
  }

  async getRates(request: CarrierRateRequest): Promise<CarrierRate | null> {
    const response = await this.request(this.options.ratesPath, 'POST', request, undefined, true);
    if (!response) return null;
    const record = nestedRecord(response);
    const price = numberValue(record, 'price_tnd', 'price', 'amount', 'total');
    if (price === null) throw new CarrierAdapterError('Carrier rate response did not include a price', 'CARRIER_INVALID_RESPONSE');
    return {
      price_tnd: price,
      cod_fee_tnd: numberValue(record, 'cod_fee_tnd', 'cod_fee', 'codFee') || 0,
      service_type: stringValue(record, 'service_type', 'service', 'service_name') || undefined,
      estimated_hours_min: numberValue(record, 'estimated_hours_min', 'hours_min') || undefined,
      estimated_hours_max: numberValue(record, 'estimated_hours_max', 'hours_max') || undefined,
      estimated_delivery: stringValue(record, 'estimated_delivery', 'delivery_date') || null,
      currency: stringValue(record, 'currency') || 'TND',
    };
  }

  async createShipment(request: CarrierShipmentRequest, idempotencyKey: string): Promise<CarrierShipmentResult> {
    const response = await this.request(this.options.createPath, 'POST', request, idempotencyKey, false);
    const record = nestedRecord(response);
    const trackingNumber = stringValue(record, 'tracking_number', 'trackingNumber', 'awb', 'awb_number', 'waybill');
    if (!trackingNumber) throw new CarrierAdapterError('Carrier create response did not include a tracking number', 'CARRIER_INVALID_RESPONSE');
    return {
      tracking_number: trackingNumber,
      provider_reference: stringValue(record, 'provider_reference', 'reference', 'shipment_id', 'id'),
      label_url: stringValue(record, 'label_url', 'labelUrl', 'label', 'pdf_url'),
      estimated_delivery: stringValue(record, 'estimated_delivery', 'delivery_date', 'estimatedDelivery'),
      status: normalizeStatus(record.status || 'created'),
      raw: record,
    };
  }

  async cancelShipment(trackingNumber: string, reason?: string): Promise<void> {
    await this.request(this.options.cancelPath.replace(':trackingNumber', encodeURIComponent(trackingNumber)), 'POST', { tracking_number: trackingNumber, reason }, trackingNumber, false);
  }

  async track(trackingNumber: string): Promise<CarrierTrackingResult> {
    const response = await this.request(this.options.trackingPath.replace(':trackingNumber', encodeURIComponent(trackingNumber)), 'GET', undefined, undefined, true);
    const record = nestedRecord(response);
    const parsedTrackingNumber = stringValue(record, 'tracking_number', 'trackingNumber', 'awb', 'waybill') || trackingNumber;
    return {
      tracking_number: parsedTrackingNumber,
      status: normalizeStatus(record.status || record.current_status || record.currentStatus),
      estimated_delivery: stringValue(record, 'estimated_delivery', 'delivery_date', 'estimatedDelivery'),
      events: parseEvents(record.events || record.checkpoints || record.history),
      raw: record,
    };
  }

  async checkHealth(): Promise<CarrierHealth> {
    const startedAt = Date.now();
    try {
      await this.request(this.options.healthPath || '/health', 'GET', undefined, undefined, true);
      return { ok: true, latency_ms: Date.now() - startedAt };
    } catch (error) {
      return {
        ok: false,
        latency_ms: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'Carrier health check failed',
      };
    }
  }

  verifyWebhook(rawBody: Buffer, signature: string | undefined): boolean {
    if (!this.options.webhookSecret || !signature) return false;
    const supplied = signature.replace(/^sha256=/i, '').trim();
    const expected = createHmac('sha256', this.options.webhookSecret).update(rawBody).digest('hex');
    const suppliedBuffer = Buffer.from(supplied, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
  }

  parseWebhook(payload: unknown): CarrierWebhookEvent | null {
    const record = nestedRecord(payload);
    const trackingNumber = stringValue(record, 'tracking_number', 'trackingNumber', 'awb', 'waybill');
    if (!trackingNumber) return null;
    const events = parseEvents(record.events || record.checkpoints || record.history);
    return {
      event_id: stringValue(record, 'event_id', 'eventId', 'id'),
      tracking_number: trackingNumber,
      status: normalizeStatus(record.status || record.current_status || record.currentStatus || events.at(-1)?.status),
      estimated_delivery: stringValue(record, 'estimated_delivery', 'delivery_date', 'estimatedDelivery'),
      events,
      raw: record,
    };
  }

  private async request(
    path: string,
    method: 'GET' | 'POST',
    body: unknown,
    idempotencyKey: string | undefined,
    rateRequest: boolean,
  ): Promise<unknown> {
    const url = new URL(path, `${this.options.baseUrl.replace(/\/$/, '')}/`).toString();
    let lastError: CarrierAdapterError | null = null;
    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
      try {
        const apiKeyHeader = this.options.apiKeyHeader?.trim() || 'Authorization';
        const apiKeyPrefix = this.options.apiKeyPrefix ?? 'Bearer ';
        const headers: Record<string, string> = {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          [apiKeyHeader]: `${apiKeyPrefix}${this.options.apiKey}`,
          'User-Agent': 'PandaMarket-Carrier/1.0',
        };
        if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
        const response = await fetch(url, {
          method,
          headers,
          redirect: 'error',
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          signal: controller.signal,
        });
        const text = await response.text();
        let payload: unknown = null;
        try {
          payload = text ? JSON.parse(text) : null;
        } catch {
          payload = { message: text.slice(0, 500) };
        }
        if (response.ok) return payload;
        const retryable = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;
        lastError = new CarrierAdapterError(`Carrier ${this.id} request failed with HTTP ${response.status}`, 'CARRIER_REQUEST_FAILED', retryable, response.status);
        if (!retryable || (!rateRequest && !idempotencyKey) || attempt === this.options.maxAttempts) throw lastError;
      } catch (error) {
        if (error instanceof CarrierAdapterError) {
          lastError = error;
          if (!error.retryable || (!rateRequest && !idempotencyKey) || attempt === this.options.maxAttempts) throw error;
        } else {
          lastError = new CarrierAdapterError(`Carrier ${this.id} request failed`, 'CARRIER_REQUEST_FAILED', true);
          if ((!rateRequest && !idempotencyKey) || attempt === this.options.maxAttempts) throw lastError;
        }
      } finally {
        clearTimeout(timeout);
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** (attempt - 1), 5000)));
    }
    throw lastError || new CarrierAdapterError(`Carrier ${this.id} request failed`, 'CARRIER_REQUEST_FAILED', true);
  }
}

export function createConfiguredCarrierAdapter(
  id: CarrierId,
  options: { timeoutMs: number; maxAttempts: number },
): HttpCarrierAdapter | null {
  const envPrefix = `PD_CARRIER_${id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  const baseUrl = process.env[`${envPrefix}_BASE_URL`]?.trim();
  const apiKey = process.env[`${envPrefix}_API_KEY`]?.trim();
  if (!baseUrl || !apiKey) return null;

  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  } catch {
    return null;
  }

  return new HttpCarrierAdapter({
    id,
    baseUrl,
    apiKey,
    apiKeyHeader: process.env[`${envPrefix}_API_KEY_HEADER`]?.trim() || 'Authorization',
    apiKeyPrefix: process.env[`${envPrefix}_API_KEY_PREFIX`] ?? 'Bearer ',
    webhookSecret: process.env[`${envPrefix}_WEBHOOK_SECRET`]?.trim() || undefined,
    timeoutMs: options.timeoutMs,
    maxAttempts: options.maxAttempts,
    ratesPath: process.env[`${envPrefix}_RATES_PATH`]?.trim() || '/rates',
    createPath: process.env[`${envPrefix}_CREATE_PATH`]?.trim() || '/shipments',
    trackingPath: process.env[`${envPrefix}_TRACKING_PATH`]?.trim() || '/shipments/:trackingNumber',
    cancelPath: process.env[`${envPrefix}_CANCEL_PATH`]?.trim() || '/shipments/:trackingNumber/cancel',
    healthPath: process.env[`${envPrefix}_HEALTH_PATH`]?.trim() || '/health',
  });
}
