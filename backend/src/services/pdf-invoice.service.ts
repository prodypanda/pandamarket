import { query } from '../db/pool';
import { PdNotFoundError, PdErrorCode } from '../errors';

export interface InvoiceItem {
  title: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface InvoiceData {
  order_id: string;
  invoice_number: string;
  date: string;
  store_name: string;
  store_matricule_fiscal: string;
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  items: InvoiceItem[];
  subtotal: number;
  shipping_total: number;
  timbre_fiscal: number;
  total_ttc: number;
}

export class PdfInvoiceService {
  /**
   * Helper to build a clean minimal PDF 1.4 binary buffer
   */
  private buildPdfFromLines(title: string, lines: string[]): Buffer {
    const contentStream = [
      'BT',
      '/F1 18 Tf',
      '50 780 Td',
      `(${this.sanitizePdfText(title)}) Tj`,
      '/F1 10 Tf',
      '0 -24 Td',
      ...lines.map((l) => `(${this.sanitizePdfText(l)}) Tj 0 -14 Td`),
      'ET',
    ].join('\n');

    const streamLength = Buffer.byteLength(contentStream, 'utf8');

    const pdfParts = [
      '%PDF-1.4\n',
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\nendobj\n`,
      `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
      'xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000056 00000 n \n0000000111 00000 n \n0000000262 00000 n \n',
      'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n360\n%%EOF',
    ];

    return Buffer.from(pdfParts.join(''), 'utf8');
  }

  private sanitizePdfText(str: string): string {
    return (str || '')
      .replace(/[\\()]/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Fetch order invoice details and generate sales invoice PDF
   */
  async generateInvoicePdf(orderId: string, storeId: string): Promise<Buffer> {
    const { rows: orderRows } = await query<{
      id: string;
      created_at: Date;
      store_name: string;
      customer_name: string;
      customer_phone: string;
      shipping_address: any;
      subtotal: string;
      shipping_total: string;
      total: string;
    }>(
      `SELECT o.id, o.created_at, s.name AS store_name,
              COALESCE(u.first_name || ' ' || u.last_name, sc.first_name || ' ' || sc.last_name, 'Client') AS customer_name,
              COALESCE(u.phone, sc.phone, '') AS customer_phone,
              o.shipping_address, o.subtotal::text, o.shipping_total::text, o.total::text
       FROM pd_order o
       JOIN pd_store s ON s.id = $2
       LEFT JOIN pd_user u ON u.id = o.customer_id
       LEFT JOIN pd_storefront_customer sc ON sc.id = o.storefront_customer_id
       WHERE o.id = $1`,
      [orderId, storeId],
    );

    const order = orderRows[0];
    if (!order) {
      throw new PdNotFoundError(PdErrorCode.ORDER_NOT_FOUND, 'Order not found');
    }

    const { rows: itemRows } = await query<{
      title: string;
      quantity: number;
      unit_price: string;
      subtotal: string;
    }>(
      `SELECT title, quantity, unit_price::text, subtotal::text
       FROM pd_order_item
       WHERE order_id = $1 AND store_id = $2`,
      [orderId, storeId],
    );

    const subtotal = parseFloat(order.subtotal || '0');
    const shipping = parseFloat(order.shipping_total || '0');
    const timbreFiscal = 1.0;
    const totalTtc = subtotal + shipping + timbreFiscal;

    const lines = [
      `Facture N: FAC-${order.id.slice(-8).toUpperCase()}`,
      `Date de facturation: ${new Date(order.created_at).toLocaleDateString('fr-TN')}`,
      '------------------------------------------------------------',
      `Vendeur: ${order.store_name} | Matricule Fiscal: 0001234/A/M/000`,
      `Client: ${order.customer_name} (${order.customer_phone})`,
      '------------------------------------------------------------',
      'Articles commandes:',
      ...itemRows.map((it) => `- ${it.title} x${it.quantity} : ${parseFloat(it.unit_price).toFixed(3)} TND (${parseFloat(it.subtotal).toFixed(3)} TND)`),
      '------------------------------------------------------------',
      `Sous-total HT: ${subtotal.toFixed(3)} TND`,
      `Frais de livraison: ${shipping.toFixed(3)} TND`,
      `Timbre Fiscal (loi de finances): ${timbreFiscal.toFixed(3)} TND`,
      `TOTAL TTC A PAYER: ${totalTtc.toFixed(3)} TND`,
    ];

    return this.buildPdfFromLines('FACTURE DE VENTE - PANDAMARKET TUNISIE', lines);
  }

  /**
   * Fetch order delivery details and generate packing slip PDF
   */
  async generatePackingSlipPdf(orderId: string, storeId: string): Promise<Buffer> {
    const { rows: orderRows } = await query<{
      id: string;
      created_at: Date;
      store_name: string;
      customer_name: string;
      customer_phone: string;
      shipping_address: any;
    }>(
      `SELECT o.id, o.created_at, s.name AS store_name,
              COALESCE(u.first_name || ' ' || u.last_name, sc.first_name || ' ' || sc.last_name, 'Client') AS customer_name,
              COALESCE(u.phone, sc.phone, '') AS customer_phone,
              o.shipping_address
       FROM pd_order o
       JOIN pd_store s ON s.id = $2
       LEFT JOIN pd_user u ON u.id = o.customer_id
       LEFT JOIN pd_storefront_customer sc ON sc.id = o.storefront_customer_id
       WHERE o.id = $1`,
      [orderId, storeId],
    );

    const order = orderRows[0];
    if (!order) {
      throw new PdNotFoundError(PdErrorCode.ORDER_NOT_FOUND, 'Order not found');
    }

    const { rows: itemRows } = await query<{
      title: string;
      quantity: number;
    }>(
      `SELECT title, quantity
       FROM pd_order_item
       WHERE order_id = $1 AND store_id = $2`,
      [orderId, storeId],
    );

    const address = typeof order.shipping_address === 'object' && order.shipping_address
      ? `${order.shipping_address.address1 || ''}, ${order.shipping_address.city || ''} ${order.shipping_address.postal_code || ''}`
      : 'Adresse client';

    const lines = [
      `Bon de Livraison N: BL-${order.id.slice(-8).toUpperCase()}`,
      `Date d'expedition: ${new Date().toLocaleDateString('fr-TN')}`,
      '------------------------------------------------------------',
      `Expediteur: ${order.store_name}`,
      `Destinataire: ${order.customer_name}`,
      `Telephone: ${order.customer_phone}`,
      `Adresse de livraison: ${address}`,
      '------------------------------------------------------------',
      'Contenu du colis a verifier a la reception:',
      ...itemRows.map((it) => `[ ] ${it.title} (Quantite: ${it.quantity})`),
      '------------------------------------------------------------',
      'Signature du livreur: _______________   Signature du client: _______________',
    ];

    return this.buildPdfFromLines('BON DE LIVRAISON - COLIS LIVRAISON', lines);
  }
}

export const pdfInvoiceService = new PdfInvoiceService();
