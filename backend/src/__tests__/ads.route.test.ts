import { beforeEach, describe, expect, it, vi } from 'vitest';

const { service, routes, zChain } = vi.hoisted(() => {
  const chain: any = {};
  const self = () => chain;
  Object.assign(chain, {
    trim: self, min: self, max: self,
    positive: self, int: self, default: self,
    optional: self, partial: self, pick: self,
    refine: self, datetime: self, date: self,
  });
  return {
    service: {
      getCampaign: vi.fn(),
      updateCampaign: vi.fn(),
      transition: vi.fn(),
      createCampaign: vi.fn(),
    },
    routes: {} as Record<string, any[]>,
    zChain: chain,
  };
});

vi.mock('express', () => ({
  Router: () => ({
    get: (path: string, ...handlers: any[]) => { routes[`GET ${path}`] = handlers; },
    post: (path: string, ...handlers: any[]) => { routes[`POST ${path}`] = handlers; },
    patch: (path: string, ...handlers: any[]) => { routes[`PATCH ${path}`] = handlers; },
  }),
}));
vi.mock('zod', () => ({ z: {
  object: () => zChain, string: () => zChain, number: () => zChain,
  enum: () => zChain, array: () => zChain, record: () => zChain,
  unknown: () => zChain, boolean: () => zChain,
  coerce: { number: () => zChain },
} }));
vi.mock('../services/ads.service', () => ({ adsService: service }));
vi.mock('../services/ads-refill.service', () => ({ adsRefillService: {} }));
vi.mock('../db/pool', () => ({ query: vi.fn() }));
vi.mock('../config', () => ({ config: { env: 'test', jwt: { secret: 'test' }, flouci: {}, konnect: {} } }));
vi.mock('../utils/logger', () => ({ logger: { warn: vi.fn() } }));
vi.mock('../middlewares', () => ({
  asyncHandler: (fn: any) => async (req: any, res: any, next: any) => { try { await fn(req, res, next); } catch (error) { next?.(error); } },
  requireStore: (req: any, _res: any, next: any) => { req.user = { id: 'seller_A', store_id: 'store_A', role: 'vendor' }; next(); },
  optionalAuth: (_req: any, _res: any, next: any) => next(),
  validate: () => (_req: any, _res: any, next: any) => next(),
  adsDeliveryRateLimit: (_req: any, _res: any, next: any) => next(),
  adsEventRateLimit: (_req: any, _res: any, next: any) => next(),
}));

import '../api/ads.route';

async function invoke(key: string, req: any = {}) {
  const handlers = routes[key];
  const res: any = {
    statusCode: 200, body: null,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: any) { this.body = payload; return this; },
  };
  let index = 0;
  const next = async (error?: any): Promise<void> => {
    if (error) throw error;
    index += 1;
    if (handlers[index]) await handlers[index](req, res, next);
  };
  await handlers[0](req, res, next);
  return res;
}

describe('ads.route tenant isolation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads campaign details only through the authenticated store', async () => {
    service.getCampaign.mockResolvedValue({ id: 'campaign_B' });
    await invoke('GET /campaigns/:id', { params: { id: 'campaign_B' } });
    expect(service.getCampaign).toHaveBeenCalledWith('store_A', 'campaign_B');
  });

  it('updates campaigns only through the authenticated store', async () => {
    service.updateCampaign.mockResolvedValue({ id: 'campaign_B' });
    await invoke('PATCH /campaigns/:id', {
      params: { id: 'campaign_B' },
      body: { name: 'Attempted cross-store edit', store_id: 'store_B' },
    });
    expect(service.updateCampaign).toHaveBeenCalledWith(
      'store_A',
      'campaign_B',
      expect.objectContaining({ store_id: 'store_B' }),
    );
  });

  it('runs lifecycle actions only through the authenticated store', async () => {
    service.transition.mockResolvedValue({ id: 'campaign_B', status: 'paused' });
    await invoke('POST /campaigns/:id/:action', { params: { id: 'campaign_B', action: 'pause' } });
    expect(service.transition).toHaveBeenCalledWith('store_A', 'campaign_B', 'paused');
  });

  it('creates campaigns for the authenticated store instead of a supplied store ID', async () => {
    service.createCampaign.mockResolvedValue({ id: 'campaign_A' });
    const body = { name: 'Campaign', store_id: 'store_B' };
    const response = await invoke('POST /campaigns', { body });
    expect(response.statusCode).toBe(201);
    expect(service.createCampaign).toHaveBeenCalledWith('store_A', body);
  });
});
