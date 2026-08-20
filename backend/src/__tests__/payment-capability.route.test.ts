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
    req.user = { id: 'buyer_1' };
    next();
  },
  requireStorefrontCustomer: (req: any, _res: any, next: any) => {
    req.storefrontCustomer = { id: 'storefront_buyer_1', store_id: 'store_1' };
    next();
  },
  validate: () => (req: any, _res: any, next: any) => next(),
}));

import cartRouter from '../api/cart.route';

const quote = {
  id: 'quote_12345678',
  quote_version: 1,
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
