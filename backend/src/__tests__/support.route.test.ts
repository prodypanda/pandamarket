import { beforeEach, describe, expect, it, vi } from 'vitest';

const { service, routes, zChain } = vi.hoisted(() => ({
  service: {
    listForSeller: vi.fn(),
    createForSeller: vi.fn(),
    getSellerTicket: vi.fn(),
    replyAsSeller: vi.fn(),
    listForAdmin: vi.fn(),
    getAdminTicket: vi.fn(),
    replyAsAdmin: vi.fn(),
    updateByAdmin: vi.fn(),
    addSellerAttachment: vi.fn(),
    addAdminAttachment: vi.fn(),
    updateSellerTicketStatus: vi.fn(),
  },
  routes: {} as Record<string, any[]>,
  zChain: {
    trim: () => zChain, min: () => zChain, max: () => zChain, int: () => zChain, url: () => zChain, optional: () => zChain, nullable: () => zChain, default: () => zChain,
  } as any,
}));

vi.mock('express', () => ({
  Router: () => ({
    get: (path: string, ...handlers: any[]) => { routes[`GET ${path}`] = handlers; },
    post: (path: string, ...handlers: any[]) => { routes[`POST ${path}`] = handlers; },
    patch: (path: string, ...handlers: any[]) => { routes[`PATCH ${path}`] = handlers; },
  }),
}));

vi.mock('zod', () => ({ z: { object: () => zChain, enum: () => zChain, string: () => zChain, boolean: () => zChain, coerce: { number: () => zChain } } }));

vi.mock('../services/support-ticket.service', () => ({ supportTicketService: service }));
vi.mock('../middlewares', () => ({
  asyncHandler: (fn: any) => async (req: any, res: any, next: any) => { try { await fn(req, res, next); } catch (e) { next?.(e); } },
  requireStore: (req: any, _res: any, next: any) => { req.user = { id: 'seller_1', store_id: 'store_1', role: 'vendor' }; next(); },
  requireAdmin: (req: any, _res: any, next: any) => { req.user = { id: 'admin_1', role: 'admin' }; next(); },
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

import '../api/support.route';

async function invoke(key: string, req: any = {}) {
  const handlers = routes[key];
  const res: any = { statusCode: 200, body: null, status(code: number) { this.statusCode = code; return this; }, json(payload: any) { this.body = payload; return this; } };
  let i = 0;
  const next = async (err?: any) => { if (err) throw err; i += 1; if (handlers[i]) await handlers[i](req, res, next); };
  await handlers[0](req, res, next);
  return res;
}

describe('support.route', () => {
  beforeEach(() => vi.clearAllMocks());
  it('GET /me delegates', async () => { service.listForSeller.mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0 } }); const r = await invoke('GET /me', { query: { page: 1, limit: 20 } }); expect(r.statusCode).toBe(200); });
  it('POST /me creates', async () => { service.createForSeller.mockResolvedValue({ ticket: { id: 't1' } }); const r = await invoke('POST /me', { body: { subject: 'Need help', description: 'Details text long' } }); expect(r.statusCode).toBe(201); });
  it('POST /admin/:id/messages delegates', async () => { service.replyAsAdmin.mockResolvedValue({ ticket: { id: 't1' }, messages: [] }); const r = await invoke('POST /admin/:id/messages', { params: { id: 't1' }, body: { body: 'Internal', is_internal: true } }); expect(r.statusCode).toBe(201); });
  it('POST /me/:id/attachments delegates', async () => { service.addSellerAttachment.mockResolvedValue({ id: 'att1' }); const r = await invoke('POST /me/:id/attachments', { params: { id: 't1' }, body: { file_name: 'x.png', mime_type: 'image/png', file_size_bytes: 1234, file_url: 'https://cdn.example/x.png' } }); expect(r.statusCode).toBe(201); });
  it('POST /admin/:id/attachments delegates', async () => { service.addAdminAttachment.mockResolvedValue({ id: 'att1' }); const r = await invoke('POST /admin/:id/attachments', { params: { id: 't1' }, body: { file_name: 'x.png', mime_type: 'image/png', file_size_bytes: 1234, file_url: 'https://cdn.example/x.png' } }); expect(r.statusCode).toBe(201); });
  it('PATCH /me/:id/status updates seller ticket status', async () => { service.updateSellerTicketStatus.mockResolvedValue({ ticket: { id: 't1' } }); const r = await invoke('PATCH /me/:id/status', { params: { id: 't1' }, body: { status: 'closed' } }); expect(r.statusCode).toBe(200); });
  it('PATCH /admin/:id updates', async () => { service.updateByAdmin.mockResolvedValue({ ticket: { id: 't1' }, messages: [] }); const r = await invoke('PATCH /admin/:id', { params: { id: 't1' }, body: { status: 'in_progress' } }); expect(r.statusCode).toBe(200); });
});
