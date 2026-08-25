import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mocks = vi.hoisted(() => ({
  createQuote: vi.fn(),
  getForQuote: vi.fn(),
}));

vi.mock('../services/cart.service', () => ({
  cartService: {
    getCart: vi.fn(),
    syncCart: vi.fn(),
    recordGamifiedLead: vi.fn(),
    getStoreGamifiedLeads: vi.fn(),
  },
}));
vi.mock('../services/checkout-quote.service', () => ({
  checkoutQuoteService: { createQuote: mocks.createQuote },
}));
vi.mock('../services/payment-capability.service', () => ({
  paymentCapabilityService: { getForQuote: mocks.getForQuote },
}));
vi.mock('../middlewares', () => ({
  asyncHandler: (handler: any) => (req: any, res: any, next: any) => Promise.resolve(handler(req, res, next)).catch(next),
  optionalAuth: (req: any, _res: any, next: any) => next(),
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'buyer_1', role: 'customer' };
    next();
  },
  requireRole:
    () =>
    (_req: any, _res: any, next: any) =>
      next(),
  requireStorefrontCustomer: (req: any, _res: any, next: any) => {
    req.storefrontCustomer = { id: 'storefront_buyer_1', store_id: 'store_1' };
    next();
  },
  validate: () => (req: any, _res: any, next: any) => next(),
}));

import cartRouter from '../api/cart.route';
import { cartService } from '../services/cart.service';

const quote = {
  id: 'quote_12345678',
  quote_version: 1,
  issued_at: '2026-08-20T12:00:00.000Z',
  currency: 'TND',
  items: [],
  shipping_address: null,
};
const paymentCapabilities = {
  quote_id: quote.id,
  quote_version: 1,
  capability_version: `pcv1_${'a'.repeat(64)}`,
  currency: 'TND',
  methods: [],
};

const app = express();
app.use(express.json());
app.use('/api/pd/cart', cartRouter);

describe('checkout quote payment capability routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createQuote.mockResolvedValue(quote);
    mocks.getForQuote.mockResolvedValue(paymentCapabilities);
  });

  it('exposes capabilities on the authenticated Hub quote', async () => {
    const response = await request(app)
      .post('/api/pd/cart/quote')
      .send({ items: [{ product_id: 'product_1', quantity: 1 }] });

    expect(response.status).toBe(201);
    expect(response.body.data.payment_capabilities).toEqual(paymentCapabilities);
    expect(mocks.createQuote).toHaveBeenCalledWith(expect.objectContaining({
      owner_user_id: 'buyer_1',
    }));
  });

  it('exposes the same contract on the tenant-scoped quote', async () => {
    const response = await request(app)
      .post('/api/pd/cart/storefront/quote')
      .send({ items: [{ product_id: 'product_1', quantity: 1 }] });

    expect(response.status).toBe(201);
    expect(response.body.data.payment_capabilities).toEqual(paymentCapabilities);
    expect(mocks.createQuote).toHaveBeenCalledWith(expect.objectContaining({
      owner_storefront_customer_id: 'storefront_buyer_1',
      store_id: 'store_1',
    }));
  });
});

// =====================================================
// Audit P0-1 / P0-2 regression guards
// =====================================================

describe('gamified spin/leads hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('never forwards client-supplied prize fields to the service (P0-1)', async () => {
    vi.mocked(cartService.recordGamifiedLead).mockResolvedValue({
      success: true,
      lead_id: 'pd_lead_test',
      coupon_code: 'SPIN-TEST01',
      prize_won: '2 TND off your next order',
      discount_value: 2,
    } as never);

    const response = await request(app)
      .post('/api/pd/cart/gamified-spin')
      .send({
        game_type: 'spin_wheel',
        phone: '+21620123456',
        prize_won: 'AUDIT_PROBE',
        coupon_code: 'AUDITPROBE1',
        discount_value: 99999,
      });

    expect(response.status).toBe(201);
    expect(cartService.recordGamifiedLead).toHaveBeenCalledTimes(1);
    const forwarded = vi.mocked(cartService.recordGamifiedLead).mock.calls[0][0];
    expect(forwarded).not.toHaveProperty('prize_won');
    expect(forwarded).not.toHaveProperty('coupon_code');
    expect(forwarded).not.toHaveProperty('discount_value');
    expect(forwarded).not.toHaveProperty('consent_given');
  });

  it('scopes gamified lead listing to the caller store and never admin mode for non-admins (P0-2)', async () => {
    vi.mocked(cartService.getStoreGamifiedLeads).mockResolvedValue([] as never);

    const response = await request(app).get('/api/pd/cart/gamified-leads');

    expect(response.status).toBe(200);
    expect(cartService.getStoreGamifiedLeads).toHaveBeenCalledWith(undefined, false);
  });
});
