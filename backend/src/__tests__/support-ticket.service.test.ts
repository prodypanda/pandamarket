import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db/pool', () => ({
  query: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../utils/crypto', () => ({
  pdId: vi.fn((prefix: string) => `${prefix}_id_12345678`),
}));

vi.mock('../services/notification.service', () => ({
  notificationService: {
    create: vi.fn().mockResolvedValue(null),
  },
}));

import { query, transaction } from '../db/pool';
import { SupportTicketService } from '../services/support-ticket.service';

const mockQuery = vi.mocked(query);
const mockTransaction = vi.mocked(transaction);

describe('SupportTicketService', () => {
  let service: SupportTicketService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SupportTicketService();
  });

  it('listForSeller returns rows and meta', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 't1', ticket_number: 'PM-1' }] } as any)
      .mockResolvedValueOnce({ rows: [{ total: '1' }] } as any);

    const result = await service.listForSeller({
      store_id: 'store_1',
      user_id: 'user_1',
      page: 1,
      limit: 20,
    });

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('createForSeller inserts ticket and first message in a transaction', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ id: 't1', ticket_number: 'PM-20260523-12345678' }] })
        .mockResolvedValueOnce({ rows: [] }),
    };
    mockTransaction.mockImplementation(async (fn: any) => fn(client));

    const result = await service.createForSeller({
      store_id: 'store_1',
      user_id: 'user_1',
      subject: 'Payment not settling',
      description: 'I need help with payout timeline issue.',
    });

    expect(client.query).toHaveBeenCalled();
    expect(result.ticket).toBeDefined();
  });


  it('addSellerAttachment stores attachment row after ownership check', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 't1', store_id: 'store_1', created_by: 'user_1' }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any);

    const result = await service.addSellerAttachment({
      ticket_id: 't1',
      store_id: 'store_1',
      user_id: 'user_1',
      file_name: 'invoice.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 1024,
      file_url: 'https://cdn.example/invoice.pdf',
    });

    expect(result.id).toBeDefined();
  });

  it('addAdminAttachment stores attachment row for existing ticket', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 't1' }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any);

    const result = await service.addAdminAttachment({
      ticket_id: 't1',
      admin_id: 'admin_1',
      file_name: 'trace.log',
      mime_type: 'text/plain',
      file_size_bytes: 2048,
      file_url: 'https://cdn.example/trace.log',
    });

    expect(result.id).toBeDefined();
  });




  it('replyAsSeller rejects replies when ticket is closed', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 't1', store_id: 'store_1', created_by: 'user_1', status: 'closed' }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any);

    await expect(
      service.replyAsSeller({
        ticket_id: 't1',
        store_id: 'store_1',
        user_id: 'user_1',
        body: 'Can I add one more detail?',
      }),
    ).rejects.toThrow('Closed tickets cannot be updated');
  });

  it('clears lifecycle timestamps when reopening ticket', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 't1' }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [{ id: 't1', status: 'in_progress' }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any);

    await service.updateByAdmin({ ticket_id: 't1', status: 'in_progress' });

    const updateSqlCalls = mockQuery.mock.calls.filter((c) => String(c[0]).includes('UPDATE pd_support_ticket SET'));
    expect(String(updateSqlCalls[0][0])).toContain('resolved_at = NULL');
    expect(String(updateSqlCalls[0][0])).toContain('closed_at = NULL');
  });

  

  it('updateSellerTicketStatus rejects when seller does not own ticket', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 't1', store_id: 'store_2', created_by: 'user_other' }] } as any);

    await expect(
      service.updateSellerTicketStatus({
        ticket_id: 't1',
        store_id: 'store_1',
        user_id: 'user_1',
        status: 'closed',
      }),
    ).rejects.toThrow('You do not have access to this support ticket');
  });

  it('updateSellerTicketStatus closes and reopens seller ticket lifecycle fields', async () => {
    mockQuery.mockImplementation(async (sql: any) => {
      const text = String(sql);
      if (text.includes('FROM pd_support_ticket') && text.includes('WHERE id = $1') && !text.includes('UPDATE')) {
        return { rows: [{ id: 't1', store_id: 'store_1', created_by: 'user_1', status: 'open' }] } as any;
      }
      if (text.includes('FROM pd_support_ticket_message')) return { rows: [] } as any;
      if (text.includes('FROM pd_support_ticket_attachment')) return { rows: [] } as any;
      if (text.includes("UPDATE pd_support_ticket") && text.includes("status = 'closed'")) {
        return { rows: [{ id: 't1', status: 'closed' }] } as any;
      }
      if (text.includes("UPDATE pd_support_ticket") && text.includes("status = 'open'")) {
        return { rows: [{ id: 't1', status: 'open' }] } as any;
      }
      if (text.includes("SELECT id FROM pd_user WHERE role IN ('admin','super_admin')")) return { rows: [] } as any;
      if (text.includes('SELECT assigned_admin_id')) return { rows: [] } as any;
      return { rows: [] } as any;
    });

    await service.updateSellerTicketStatus({ ticket_id: 't1', store_id: 'store_1', user_id: 'user_1', status: 'closed' });
    await service.updateSellerTicketStatus({ ticket_id: 't1', store_id: 'store_1', user_id: 'user_1', status: 'open' });

    const sqlTexts = mockQuery.mock.calls.map((c) => String(c[0]));
    const closeSql = sqlTexts.find((t) => t.includes("status = 'closed'"));
    const reopenSql = sqlTexts.find((t) => t.includes("status = 'open'"));
    expect(closeSql).toContain('closed_at = COALESCE(closed_at, NOW())');
    expect(reopenSql).toContain('resolved_at = NULL');
    expect(reopenSql).toContain('closed_at = NULL');
  });

  it('updateByAdmin sets lifecycle timestamps for resolved/closed', async () => {

    mockQuery
      // resolved path
      .mockResolvedValueOnce({ rows: [{ id: 't1' }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [{ id: 't1', status: 'resolved' }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      // closed path
      .mockResolvedValueOnce({ rows: [{ id: 't1' }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [{ id: 't1', status: 'closed' }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any);

    await service.updateByAdmin({ ticket_id: 't1', status: 'resolved' });
    await service.updateByAdmin({ ticket_id: 't1', status: 'closed' });

    const updateSqlCalls = mockQuery.mock.calls.filter((c) => String(c[0]).includes('UPDATE pd_support_ticket SET'));
    expect(updateSqlCalls.length).toBeGreaterThanOrEqual(2);
    expect(String(updateSqlCalls[0][0])).toContain('resolved_at = COALESCE(resolved_at, NOW())');
    expect(String(updateSqlCalls[1][0])).toContain('closed_at = COALESCE(closed_at, NOW())');
  });
});
