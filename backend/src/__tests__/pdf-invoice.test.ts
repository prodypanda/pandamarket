import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: mockQuery,
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { pdfInvoiceService } from '../services/pdf-invoice.service';
import { PdNotFoundError } from '../errors';

describe('PLAN-M-17: Automated PDF Invoice & Delivery Slip Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates compliant Tunisian sales invoice PDF buffer with Timbre Fiscal and Matricule Fiscal', async () => {
    // 1. SELECT order details
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'ord_12345678',
          created_at: new Date('2026-08-20T10:00:00Z'),
          store_name: 'Artisanat Jasmin',
          customer_name: 'Karim Ben Salem',
          customer_phone: '+21620123456',
          shipping_address: { address1: 'Avenue Habib Bourguiba', city: 'Tunis', postal_code: '1000' },
          subtotal: '80.000',
          shipping_total: '7.000',
          total: '88.000',
        },
      ],
    });

    // 2. SELECT order items
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          title: 'Vase en Ceramique',
          quantity: 2,
          price: '40.000',
          subtotal: '80.000',
        },
      ],
    });

    const pdfBuffer = await pdfInvoiceService.generateInvoicePdf('ord_12345678', 'store_jasmin');
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);

    const pdfText = pdfBuffer.toString('utf8');
    expect(pdfText).toContain('%PDF-1.4');
    expect(pdfText).toContain('FACTURE DE VENTE');
    expect(pdfText).toContain('Timbre Fiscal');
    expect(pdfText).toContain('Artisanat Jasmin');
  });

  it('generates delivery packing slip PDF buffer', async () => {
    // 1. SELECT order details
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'ord_12345678',
          created_at: new Date('2026-08-20T10:00:00Z'),
          store_name: 'Artisanat Jasmin',
          customer_name: 'Karim Ben Salem',
          customer_phone: '+21620123456',
          shipping_address: { address1: 'Avenue Habib Bourguiba', city: 'Tunis', postal_code: '1000' },
        },
      ],
    });

    // 2. SELECT order items
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          title: 'Vase en Ceramique',
          quantity: 2,
        },
      ],
    });

    const pdfBuffer = await pdfInvoiceService.generatePackingSlipPdf('ord_12345678', 'store_jasmin');
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);

    const pdfText = pdfBuffer.toString('utf8');
    expect(pdfText).toContain('%PDF-1.4');
    expect(pdfText).toContain('BON DE LIVRAISON');
    expect(pdfText).toContain('Karim Ben Salem');
  });

  it('throws PdNotFoundError if order is missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(
      pdfInvoiceService.generateInvoicePdf('ord_nonexistent', 'store_1'),
    ).rejects.toThrow(PdNotFoundError);
  });
});
