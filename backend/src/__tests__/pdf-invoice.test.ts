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
import { PdNotFoundError, PdForbiddenError } from '../errors';

describe('PLAN-M-17 & Plan 01: Automated PDF Invoice & Delivery Slip Generator', () => {
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
          store_matricule_fiscal: '0001234/A/M/000',
          customer_name: 'Karim Ben Salem',
          customer_phone: '+21620123456',
          shipping_address: { address1: 'Avenue Habib Bourguiba', city: 'Tunis', postal_code: '1000' },
          subtotal: '80.000',
          shipping_total: '7.000',
          total: '88.000',
          currency: 'TND',
          payment_gateway: 'cod',
          payment_status: 'captured',
        },
      ],
    });

    // 2. SELECT order items
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          title: 'Vase en Ceramique',
          quantity: 2,
          unit_price: '40.000',
          subtotal: '80.000',
        },
      ],
    });

    // 3. Fallback matricule
    mockQuery.mockResolvedValueOnce({
      rows: [{ value: '0001234/A/M/000' }],
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

  it('generates buyer-facing invoice PDF for captured marketplace order', async () => {
    // 1. SELECT order
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'ord_buyer_12345',
          created_at: new Date('2026-08-25T14:00:00Z'),
          payment_gateway: 'konnect',
          payment_status: 'captured',
          status: 'fulfilled',
          subtotal: '120.000',
          shipping_total: '7.000',
          tax_total: '0.000',
          total: '127.000',
          currency: 'TND',
          shipping_address: { address_line_1: 'Route de la Marsa', city: 'Tunis' },
          customer_name: 'Amine Trabelsi',
          customer_phone: '+21698765432',
          customer_email: 'amine@example.com',
        },
      ],
    });

    // 2. Platform matricule fallback
    mockQuery.mockResolvedValueOnce({
      rows: [{ value: '0001234/A/M/000' }],
    });

    // 3. SELECT items
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          title: 'Ecouteurs Bluetooth',
          quantity: 1,
          unit_price: '120.000',
          subtotal: '120.000',
          store_name: 'TechStore TN',
          store_matricule_fiscal: '0098765/B/N/000',
        },
      ],
    });

    const pdfBuffer = await pdfInvoiceService.generateBuyerInvoicePdf('ord_buyer_12345', 'usr_buyer_1', {
      channel: 'marketplace',
    });
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);

    const pdfText = pdfBuffer.toString('utf8');
    expect(pdfText).toContain('%PDF-1.4');
    expect(pdfText).toContain('FACTURE OFFICIELLE');
    expect(pdfText).toContain('Amine Trabelsi');
    expect(pdfText).toContain('TechStore TN');
  });

  it('rejects buyer invoice generation if payment is not captured on online order', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'ord_unpaid_123',
          payment_gateway: 'flouci',
          payment_status: 'pending',
          status: 'pending',
          customer_id: 'usr_1',
        },
      ],
    });

    await expect(
      pdfInvoiceService.generateBuyerInvoicePdf('ord_unpaid_123', 'usr_1', { channel: 'marketplace' }),
    ).rejects.toThrow(PdForbiddenError);
  });

  it('throws PdNotFoundError if order is missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(
      pdfInvoiceService.generateInvoicePdf('ord_nonexistent', 'store_1'),
    ).rejects.toThrow(PdNotFoundError);
  });
});
