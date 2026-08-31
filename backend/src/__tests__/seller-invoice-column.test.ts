import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: mockQuery,
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { pdfInvoiceService } from '../services/pdf-invoice.service';

/**
 * Regression guard for the seller invoice endpoint (audit "fixes Gestion des
 * Commandes" 01, INV-01): the items query must select the REAL column
 * `unit_price` — the original query used `price`, which does not exist in
 * pd_order_item and made GET /seller/orders/:id/invoice.pdf fail with a 500
 * on every call in production.
 */
describe('INV-01: seller invoice items query uses the real column', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries unit_price (not the non-existent price column) and renders item prices', async () => {
    const orderRow = {
      id: 'ord_invfix_1',
      created_at: new Date('2026-08-31T10:00:00Z'),
      store_name: 'InvFix Store',
      customer_name: 'Inv Fix',
      customer_phone: '21600000000',
      shipping_address: { city: 'Tunis' },
      subtotal: '60.000',
      shipping_total: '7.000',
      total: '67.000',
    };
    const itemRow = {
      title: 'Vase Test Invoice',
      quantity: 2,
      unit_price: '30.000',
      subtotal: '60.000',
    };

    mockQuery.mockImplementation(async (sql: string) => {
      const q = String(sql);
      if (q.includes('store_name')) return { rows: [orderRow] };
      if (q.includes('FROM pd_order_item')) {
        // The regression guard: the SQL must reference unit_price and must
        // NOT reference the non-existent bare `price` column.
        expect(q).toContain('unit_price');
        expect(q).not.toMatch(/\bprice::text\b/);
        expect(q).not.toMatch(/SELECT title, quantity, price,/);
        return { rows: [itemRow] };
      }
      return { rows: [] };
    });

    const pdf = await pdfInvoiceService.generateInvoicePdf('ord_invfix_1', 'store_invfix');

    // A PDF buffer was produced (header + EOF)
    expect(Buffer.isBuffer(pdf)).toBe(true);
    const head = pdf.subarray(0, 8).toString('utf8');
    expect(head).toContain('%PDF-1.4');
    expect(pdf.toString('latin1')).toContain('%%EOF');

    // The rendered item line carries the unit price from the fixed column
    const content = pdf.toString('latin1');
    expect(content).toContain('30.000 TND');
    expect(content).toContain('60.000 TND');
    expect(content).toContain('Vase Test Invoice');
  });

  it('packing slip still works (no price columns involved)', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      const q = String(sql);
      if (q.includes('store_name')) {
        return {
          rows: [{
            id: 'ord_invfix_1',
            created_at: new Date(),
            store_name: 'InvFix Store',
            customer_name: 'Inv Fix',
            customer_phone: '21600000000',
            shipping_address: { address1: 'Rue 1', city: 'Tunis', postal_code: '1000' },
          }],
        };
      }
      if (q.includes('FROM pd_order_item')) {
        return { rows: [{ title: 'Vase Test Invoice', quantity: 2 }] };
      }
      return { rows: [] };
    });

    const pdf = await pdfInvoiceService.generatePackingSlipPdf('ord_invfix_1', 'store_invfix');
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.toString('latin1')).toContain('Vase Test Invoice');
  });
});
