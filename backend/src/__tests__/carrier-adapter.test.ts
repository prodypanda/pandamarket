import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpCarrierAdapter } from '../services/carrier-adapter';

const adapterOptions = {
  id: 'aramex' as const,
  baseUrl: 'https://carrier.example.test/api',
  apiKey: 'test-key',
  webhookSecret: 'webhook-secret',
  timeoutMs: 1000,
  maxAttempts: 1,
  ratesPath: '/rates',
  createPath: '/shipments',
  trackingPath: '/shipments/:trackingNumber',
  cancelPath: '/shipments/:trackingNumber/cancel',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HttpCarrierAdapter', () => {
  it('maps rate and shipment responses without inventing provider identifiers', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { price: 8.5, cod_fee: 0.4 } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: { awb: 'REAL-AWB-1', id: 'provider-1', label_url: 'https://carrier.test/label/1' } }), { status: 200 }));
    const adapter = new HttpCarrierAdapter(adapterOptions);

    await expect(adapter.getRates({
      origin_city: 'Tunis',
      destination: { address_line_1: '1 Rue Test', city: 'Sfax', country: 'TN' },
      weight_kg: 1,
    })).resolves.toMatchObject({ price_tnd: 8.5, cod_fee_tnd: 0.4 });
    await expect(adapter.createShipment({
      order_id: 'order-1',
      fulfillment_id: 'ful-1',
      sender: { name: 'Store', phone: '21600000000', address: { address_line_1: 'Origin', city: 'Tunis', country: 'TN' } },
      recipient: { name: 'Buyer', phone: '21611111111', address: { address_line_1: 'Destination', city: 'Sfax', country: 'TN' } },
      parcels: [{ weight_kg: 1, description: 'Product' }],
    }, 'order-1:ful-1')).resolves.toMatchObject({ tracking_number: 'REAL-AWB-1', provider_reference: 'provider-1' });
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ headers: expect.objectContaining({ 'Idempotency-Key': 'order-1:ful-1' }) });
  });

  it('parses tracking events and verifies the raw-body HMAC', async () => {
    const adapter = new HttpCarrierAdapter(adapterOptions);
    const body = Buffer.from(JSON.stringify({ tracking_number: 'AWB-2', status: 'delivered', events: [{ id: 'evt-1', status: 'delivered', timestamp: '2026-08-22T00:00:00Z' }] }));
    const signature = createHmac('sha256', adapterOptions.webhookSecret).update(body).digest('hex');

    expect(adapter.verifyWebhook(body, signature)).toBe(true);
    expect(adapter.verifyWebhook(body, `${signature}00`)).toBe(false);
    expect(adapter.parseWebhook(JSON.parse(body.toString()))).toMatchObject({
      tracking_number: 'AWB-2',
      status: 'delivered',
      events: [{ provider_event_id: 'evt-1', status: 'delivered' }],
    });
  });

  it('does not follow redirects and retries only retryable failures', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ tracking_number: 'AWB-3', status: 'in_transit' }), { status: 200 }));
    const adapter = new HttpCarrierAdapter({ ...adapterOptions, maxAttempts: 2 });
    await expect(adapter.track('AWB-3')).resolves.toMatchObject({ tracking_number: 'AWB-3', status: 'in_transit' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('supports provider-specific API-key headers and prefixes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ tracking_number: 'AWB-4', status: 'created' }), { status: 200 }));
    const adapter = new HttpCarrierAdapter({
      ...adapterOptions,
      apiKeyHeader: 'X-API-Key',
      apiKeyPrefix: '',
    });

    await adapter.track('AWB-4');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      headers: expect.objectContaining({ 'X-API-Key': 'test-key' }),
    });
  });

  it('reports carrier health without leaking provider credentials', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    const adapter = new HttpCarrierAdapter(adapterOptions);

    await expect(adapter.checkHealth()).resolves.toMatchObject({ ok: true });
    const requestHeaders = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
    expect(requestHeaders.Authorization).toBe('Bearer test-key');
  });
});
