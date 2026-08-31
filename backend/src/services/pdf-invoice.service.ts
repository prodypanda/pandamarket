import { query } from '../db/pool';
import { PdNotFoundError, PdErrorCode, PdForbiddenError } from '../errors';

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
   * Helper to build a clean standard-compliant PDF 1.4 binary buffer with dynamic byte offsets
   */
  private buildPdfFromLines(title: string, lines: string[]): Buffer {
    const safeTitle = this.sanitizePdfText(title);
    const safeLines = lines.slice(0, 48).map((l) => this.sanitizePdfText(l));

    const contentStream = [
      'BT',
      '/F1 16 Tf',
      '50 780 Td',
      `(${safeTitle}) Tj`,
      '/F1 10 Tf',
      '0 -24 Td',
      ...safeLines.map((l) => `(${l}) Tj 0 -14 Td`),
      'ET',
    ].join('\n');

    const streamLength = Buffer.byteLength(contentStream, 'utf8');

    const header = '%PDF-1.4\n';
    const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
    const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
    const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\nendobj\n';
    const obj4 = `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`;

    const offset1 = Buffer.byteLength(header, 'utf8');
    const offset2 = offset1 + Buffer.byteLength(obj1, 'utf8');
    const offset3 = offset2 + Buffer.byteLength(obj2, 'utf8');
    const offset4 = offset3 + Buffer.byteLength(obj3, 'utf8');
    const startxref = offset4 + Buffer.byteLength(obj4, 'utf8');

    const pad = (n: number) => n.toString().padStart(10, '0');
    const xref = [
      'xref',
      '0 5',
      '0000000000 65535 f ',
      `${pad(offset1)} 00000 n `,
      `${pad(offset2)} 00000 n `,
      `${pad(offset3)} 00000 n `,
      `${pad(offset4)} 00000 n `,
      'trailer',
      '<< /Size 5 /Root 1 0 R >>',
      'startxref',
      `${startxref}`,
      '%%EOF',
    ].join('\n');

    return Buffer.from(`${header}${obj1}${obj2}${obj3}${obj4}${xref}`, 'utf8');
  }

  private sanitizePdfText(str: string): string {
    return (str || '')
      .replace(/[\\()]/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
  }

  /**
   * Fetch order invoice details and generate sales invoice PDF (vendor scoped)
   */
  async generateInvoicePdf(orderId: string, storeId: string): Promise<Buffer> {
    const { rows: orderRows } = await query<{
      id: string;
      created_at: Date;
      store_name: string;
      store_matricule_fiscal: string | null;
      customer_name: string;
      customer_phone: string;
      shipping_address: any;
      subtotal: string;
      shipping_total: string;
      total: string;
      currency: string;
      payment_gateway: string;
      payment_status: string;
    }>(
      `SELECT o.id, o.created_at, s.name AS store_name, s.matricule_fiscal AS store_matricule_fiscal,
              COALESCE(u.first_name || ' ' || u.last_name, sc.first_name || ' ' || sc.last_name, 'Client') AS customer_name,
              COALESCE(u.phone, sc.phone, '') AS customer_phone,
              o.shipping_address, o.subtotal::text, o.shipping_total::text, o.total::text, o.currency,
              o.payment_gateway, o.payment_status
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

    const { rows: fallbackRows } = await query<{ value: string }>(
      `SELECT value FROM pd_platform_config WHERE key = 'invoice_platform_matricule_fiscal'`,
    );
    const platformMatricule = fallbackRows[0]?.value || '0001234/A/M/000';
    const storeMatricule = order.store_matricule_fiscal || platformMatricule;

    const subtotal = parseFloat(order.subtotal || '0');
    const shipping = parseFloat(order.shipping_total || '0');
    const timbreFiscal = order.payment_gateway === 'cod' ? 1.0 : 0.0;
    const totalTtc = subtotal + shipping + timbreFiscal;

    const lines = [
      `Facture N: FAC-${order.id.slice(-8).toUpperCase()}`,
      `Date de facturation: ${new Date(order.created_at).toLocaleDateString('fr-TN')}`,
      '------------------------------------------------------------',
      `Vendeur: ${order.store_name} | Matricule Fiscal: ${storeMatricule}`,
      `Client: ${order.customer_name} (${order.customer_phone || 'Non renseigne'})`,
      '------------------------------------------------------------',
      'Articles commandes:',
      ...itemRows.map((it) => `- ${it.title} x${it.quantity} : ${parseFloat(it.unit_price).toFixed(3)} TND (${parseFloat(it.subtotal).toFixed(3)} TND)`),
      '------------------------------------------------------------',
      `Sous-total: ${subtotal.toFixed(3)} TND`,
      `Frais de livraison: ${shipping.toFixed(3)} TND`,
      ...(timbreFiscal > 0 ? [`Timbre Fiscal (loi de finances): ${timbreFiscal.toFixed(3)} TND`] : []),
      `TOTAL TTC A PAYER: ${totalTtc.toFixed(3)} ${order.currency || 'TND'}`,
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
      ? `${order.shipping_address.address_line_1 || order.shipping_address.address1 || ''}, ${order.shipping_address.city || ''} ${order.shipping_address.postal_code || ''}`
      : 'Adresse client';

    const lines = [
      `Bon de Livraison N: BL-${order.id.slice(-8).toUpperCase()}`,
      `Date d'expedition: ${new Date().toLocaleDateString('fr-TN')}`,
      '------------------------------------------------------------',
      `Expediteur: ${order.store_name}`,
      `Destinataire: ${order.customer_name}`,
      `Telephone: ${order.customer_phone || 'Non renseigne'}`,
      `Adresse de livraison: ${address}`,
      '------------------------------------------------------------',
      'Contenu du colis a verifier a la reception:',
      ...itemRows.map((it) => `[ ] ${it.title} (Quantite: ${it.quantity})`),
      '------------------------------------------------------------',
      'Signature du livreur: _______________   Signature du client: _______________',
    ];

    return this.buildPdfFromLines('BON DE LIVRAISON - COLIS LIVRAISON', lines);
  }

  /**
   * Generate official customer-facing sales invoice PDF (strict channel isolation)
   */
  async generateBuyerInvoicePdf(
    orderId: string,
    customerId: string,
    opts: { channel: 'marketplace' | 'storefront'; storeId?: string },
  ): Promise<Buffer> {
    let orderQuery = '';
    let params: unknown[] = [];

    if (opts.channel === 'marketplace') {
      orderQuery = `
        SELECT o.id, o.created_at, o.payment_gateway, o.payment_status, o.status,
               o.subtotal::text, o.shipping_total::text, o.tax_total::text, o.total::text, o.currency,
               o.shipping_address,
               COALESCE(u.first_name || ' ' || u.last_name, 'Client') AS customer_name,
               COALESCE(u.phone, '') AS customer_phone,
               COALESCE(u.email, '') AS customer_email
        FROM pd_order o
        LEFT JOIN pd_user u ON u.id = o.customer_id
        WHERE o.id = $1 AND o.customer_id = $2
      `;
      params = [orderId, customerId];
    } else {
      orderQuery = `
        SELECT o.id, o.created_at, o.payment_gateway, o.payment_status, o.status,
               o.subtotal::text, o.shipping_total::text, o.tax_total::text, o.total::text, o.currency,
               o.shipping_address,
               COALESCE(sc.first_name || ' ' || sc.last_name, 'Client') AS customer_name,
               COALESCE(sc.phone, '') AS customer_phone,
               COALESCE(sc.email, '') AS customer_email
        FROM pd_order o
        LEFT JOIN pd_storefront_customer sc ON sc.id = o.storefront_customer_id
        WHERE o.id = $1 AND o.storefront_customer_id = $2
          AND EXISTS (SELECT 1 FROM pd_order_item oi WHERE oi.order_id = o.id AND oi.store_id = $3)
      `;
      params = [orderId, customerId, opts.storeId];
    }

    const { rows: orderRows } = await query<{
      id: string;
      created_at: Date;
      payment_gateway: string;
      payment_status: string;
      status: string;
      subtotal: string;
      shipping_total: string;
      tax_total: string;
      total: string;
      currency: string;
      shipping_address: any;
      customer_name: string;
      customer_phone: string;
      customer_email: string;
    }>(orderQuery, params);

    const order = orderRows[0];
    if (!order) {
      throw new PdNotFoundError(PdErrorCode.ORDER_NOT_FOUND, 'Commande introuvable ou acces non autorise');
    }

    // Payment gating: buyer invoice only available if captured or delivered COD
    const isPaid = order.payment_status === 'captured';
    const isDeliveredCod = order.payment_gateway === 'cod' && order.status === 'delivered';
    if (!isPaid && !isDeliveredCod) {
      throw new PdForbiddenError(
        PdErrorCode.PERM_FORBIDDEN,
        'La facture n’est disponible qu’après confirmation du paiement ou livraison',
      );
    }

    // Fetch store tax matricule fiscal fallback
    const { rows: fallbackRows } = await query<{ value: string }>(
      `SELECT value FROM pd_platform_config WHERE key = 'invoice_platform_matricule_fiscal'`,
    );
    const platformMatricule = fallbackRows[0]?.value || '0001234/A/M/000';

    // Fetch items
    const storeFilter = opts.storeId ? 'AND i.store_id = $2' : '';
    const itemParams = opts.storeId ? [orderId, opts.storeId] : [orderId];
    const { rows: items } = await query<{
      title: string;
      quantity: number;
      unit_price: string;
      subtotal: string;
      store_name: string;
      store_matricule_fiscal: string | null;
    }>(
      `SELECT i.title, i.quantity, i.unit_price::text, i.subtotal::text,
              s.name AS store_name, s.matricule_fiscal AS store_matricule_fiscal
       FROM pd_order_item i
       JOIN pd_store s ON s.id = i.store_id
       WHERE i.order_id = $1 ${storeFilter}
       ORDER BY i.created_at ASC`,
      itemParams,
    );

    const subtotal = parseFloat(order.subtotal || '0');
    const shipping = parseFloat(order.shipping_total || '0');
    const timbreFiscal = order.payment_gateway === 'cod' ? 1.0 : 0.0;
    const totalTtc = subtotal + shipping + timbreFiscal;

    const vendorNames = Array.from(new Set(items.map((i) => i.store_name))).join(', ');
    const vendorMatricule = items[0]?.store_matricule_fiscal || platformMatricule;

    const address = typeof order.shipping_address === 'object' && order.shipping_address
      ? `${order.shipping_address.address_line_1 || order.shipping_address.address1 || ''}, ${order.shipping_address.city || ''}`
      : 'Tunisie';

    const lines = [
      `FACTURE OFFICIELLE N: FAC-${order.id.slice(-8).toUpperCase()}`,
      `Date de facturation : ${new Date(order.created_at).toLocaleDateString('fr-TN')}`,
      `Mode de paiement : ${order.payment_gateway.toUpperCase()} (Statut: ${order.payment_status.toUpperCase()})`,
      '------------------------------------------------------------',
      `Vendeur(s) : ${vendorNames} | Matricule Fiscal : ${vendorMatricule}`,
      `Client : ${order.customer_name} | Tel : ${order.customer_phone || 'Non renseigne'}`,
      `Adresse de livraison : ${address}`,
      '------------------------------------------------------------',
      'ARTICLES COMMANDES :',
      ...items.map(
        (it) => `- ${it.title} (x${it.quantity}) : ${parseFloat(it.unit_price).toFixed(3)} TND | Total: ${parseFloat(it.subtotal).toFixed(3)} TND`,
      ),
      '------------------------------------------------------------',
      `Sous-total : ${subtotal.toFixed(3)} TND`,
      `Frais de livraison : ${shipping.toFixed(3)} TND`,
      ...(timbreFiscal > 0 ? [`Timbre Fiscal (loi de finances) : ${timbreFiscal.toFixed(3)} TND`] : []),
      `TOTAL TTC REGLÉ : ${totalTtc.toFixed(3)} ${order.currency || 'TND'}`,
      '',
      'Document justificatif de vente valide en Tunisie - PandaMarket TN',
    ];

    return this.buildPdfFromLines(`FACTURE DE VENTE - PANDAMARKET #${order.id.slice(-8).toUpperCase()}`, lines);
  }
}

export const pdfInvoiceService = new PdfInvoiceService();
