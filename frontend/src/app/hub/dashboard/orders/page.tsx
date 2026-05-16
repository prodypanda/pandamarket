'use client';

import { fetchWithCsrf } from '@/lib/api';
import { exportToCsv, type CsvColumn } from '@/lib/csv-export';
import { useCallback, useEffect, useState } from 'react';
import { Search, Filter, Eye, Truck, Loader2, MessageSquare, X, CalendarDays, CreditCard, PackageCheck, RefreshCw, TrendingUp, CheckCircle2, Clock3, Ban, ReceiptText, Package, Mail, Phone, MapPin, Printer, StickyNote, Save, Download, ExternalLink } from 'lucide-react';

interface Order {
  id: string;
  customer_id?: string | null;
  storefront_customer_id?: string | null;
  status: string;
  payment_gateway: string;
  payment_status: string;
  payment_reference?: string | null;
  subtotal: string;
  shipping_total: string;
  total: string;
  currency: string;
  created_at: string;
  shipping_address?: ShippingAddress | null;
  store_subtotal?: string | null;
  store_shipping_total?: string | null;
  store_total?: string | null;
  fulfillment_id?: string | null;
  fulfillment_status?: string | null;
  carrier?: string | null;
  tracking_number?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  customer_email?: string | null;
  customer_first_name?: string | null;
  customer_last_name?: string | null;
  customer_phone?: string | null;
  store_name?: string | null;
  store_subdomain?: string | null;
  store_custom_domain?: string | null;
  store_settings?: Record<string, unknown> | null;
  items?: OrderItem[];
  seller_note?: SellerOrderNote | null;
}

interface ShippingAddress {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

interface OrderItem {
  id?: string;
  product_id?: string;
  variant_id?: string | null;
  product_title?: string | null;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  subtotal?: number | string | null;
  product_type?: string | null;
  thumbnail?: string | null;
  variant_sku?: string | null;
  variant_title?: string | null;
}

interface SellerOrderNote {
  id: string;
  order_id: string;
  store_id: string;
  body: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderSummary {
  total_orders: number;
  open_orders: number;
  to_ship: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  refunded: number;
  captured_orders: number;
  captured_revenue: number;
  revenue_today: number;
  revenue_7d: number;
  revenue_30d: number;
  average_order_value: number;
}

interface OrderMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  summary?: OrderSummary;
}

interface TimelineStep {
  label: string;
  description: string;
  date?: string | null;
  state: 'done' | 'current' | 'pending' | 'failed';
}

type PrintDocumentKind = 'invoice' | 'delivery_slip';

const CARRIER_OPTIONS = [
  { label: 'Aramex', value: 'Aramex', trackingUrl: (tracking: string) => `https://www.aramex.com/track/results?ShipmentNumber=${encodeURIComponent(tracking)}` },
  { label: 'DHL', value: 'DHL', trackingUrl: (tracking: string) => `https://www.dhl.com/tn-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encodeURIComponent(tracking)}` },
  { label: 'FedEx', value: 'FedEx', trackingUrl: (tracking: string) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(tracking)}` },
  { label: 'UPS', value: 'UPS', trackingUrl: (tracking: string) => `https://www.ups.com/track?tracknum=${encodeURIComponent(tracking)}` },
  { label: 'La Poste Tunisienne', value: 'La Poste Tunisienne', trackingUrl: (tracking: string) => `https://www.poste.tn/suivi?code=${encodeURIComponent(tracking)}` },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'payment_required': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'processing': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'fulfilled': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'delivered': return 'bg-green-50 text-green-700 border-green-200';
    case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const statusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'En attente',
    payment_required: 'Paiement requis',
    processing: 'En cours',
    fulfilled: 'Expédié',
    delivered: 'Livré',
    cancelled: 'Annulé',
  };
  return labels[status] || status;
};

const paymentStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'En attente',
    captured: 'Payé',
    failed: 'Échec',
    refunded: 'Remboursé',
  };
  return labels[status] || status || '—';
};

const paymentStatusColor = (status: string) => {
  switch (status) {
    case 'captured': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'failed': return 'bg-red-50 text-red-700 border-red-200';
    case 'refunded': return 'bg-slate-100 text-slate-700 border-slate-200';
    default: return 'bg-amber-50 text-amber-700 border-amber-200';
  }
};

async function getErrorMessage(res: Response, fallback = 'Erreur') {
  try {
    const data = await res.json();
    return data.error?.message || data.message || `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

function toNumber(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatMoney(value: unknown, currency = 'TND') {
  return `${toNumber(value).toFixed(3)} ${currency}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-TN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatAddressLines(address?: ShippingAddress | null) {
  if (!address) return [];
  return [
    [address.first_name, address.last_name].filter(Boolean).join(' ').trim(),
    address.address_line_1,
    address.address_line_2,
    [address.postal_code, address.city].filter(Boolean).join(' ').trim(),
    address.country || 'TN',
    address.phone ? `Tél: ${address.phone}` : '',
  ].filter((line): line is string => typeof line === 'string' && line.trim().length > 0);
}

function customerName(order: Order) {
  const name = [order.customer_first_name, order.customer_last_name].filter(Boolean).join(' ').trim();
  return name || order.customer_email || order.customer_id || order.storefront_customer_id || 'Client';
}

function orderShortId(order: Order) {
  return order.id.slice(-8).toUpperCase();
}

function stringSetting(settings: Record<string, unknown> | null | undefined, key: string) {
  const value = settings?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function storeDisplayName(order: Order) {
  return stringSetting(order.store_settings, 'store_name') || order.store_name || 'PandaMarket Seller';
}

function storeContactLines(order: Order) {
  const settings = order.store_settings;
  return [
    storeDisplayName(order),
    stringSetting(settings, 'address'),
    [stringSetting(settings, 'city'), stringSetting(settings, 'country')].filter(Boolean).join(', '),
    stringSetting(settings, 'phone'),
    stringSetting(settings, 'email'),
    order.store_custom_domain || (order.store_subdomain ? `${order.store_subdomain}.pandamarket.tn` : ''),
  ].filter((line): line is string => typeof line === 'string' && line.trim().length > 0);
}

function openOrderPrintDocument(order: Order, kind: PrintDocumentKind, marketplaceName: string) {
  if (typeof window === 'undefined') return false;
  const printWindow = window.open('', '_blank', 'width=1024,height=768');
  if (!printWindow) return false;

  const isInvoice = kind === 'invoice';
  const currency = order.currency || 'TND';
  const shortId = orderShortId(order);
  const docCode = isInvoice ? `INV-${shortId}` : `DEL-${shortId}`;
  const docTitle = isInvoice ? 'Facture' : 'Bon de livraison';
  const docSubtitle = isInvoice
    ? 'Document de facturation vendeur pour la commande boutique.'
    : 'Document de préparation colis sans prix, destiné à l’expédition.';
  const storeLines = storeContactLines(order).map((line) => escapeHtml(line)).join('<br />');
  const shippingAddressLines = formatAddressLines(order.shipping_address);
  const shippingAddress = shippingAddressLines.length > 0
    ? shippingAddressLines.map((line) => escapeHtml(line)).join('<br />')
    : 'Pas d’adresse requise';
  const items = order.items || [];
  const itemRows = items.length > 0
    ? items.map((item, index) => {
      const details = [
        item.variant_title,
        item.variant_sku ? `SKU ${item.variant_sku}` : '',
        item.product_type,
      ].filter(Boolean).join(' · ');

      if (isInvoice) {
        return `
          <tr>
            <td class="center">${index + 1}</td>
            <td>
              <strong>${escapeHtml(item.product_title || 'Produit')}</strong>
              ${details ? `<small>${escapeHtml(details)}</small>` : ''}
            </td>
            <td class="center">${escapeHtml(toNumber(item.quantity))}</td>
            <td class="right">${escapeHtml(formatMoney(item.unit_price, currency))}</td>
            <td class="right">${escapeHtml(formatMoney(item.subtotal, currency))}</td>
          </tr>
        `;
      }

      return `
        <tr>
          <td class="center">${index + 1}</td>
          <td>
            <strong>${escapeHtml(item.product_title || 'Produit')}</strong>
            ${details ? `<small>${escapeHtml(details)}</small>` : ''}
          </td>
          <td class="center">${escapeHtml(toNumber(item.quantity))}</td>
          <td class="center"><span class="checkbox"></span></td>
        </tr>
      `;
    }).join('')
    : `<tr><td colspan="${isInvoice ? 5 : 4}" class="empty">Détail des articles indisponible.</td></tr>`;

  const tableHeader = isInvoice
    ? `
        <tr>
          <th class="center">#</th>
          <th>Article</th>
          <th class="center">Qté</th>
          <th class="right">Prix unitaire</th>
          <th class="right">Total</th>
        </tr>
      `
    : `
        <tr>
          <th class="center">#</th>
          <th>Article à préparer</th>
          <th class="center">Qté</th>
          <th class="center">Contrôle</th>
        </tr>
      `;

  const totalsSection = isInvoice
    ? `
      <section class="totals">
        <div class="totals-box">
          <div class="total-row"><span>Sous-total boutique</span><span>${escapeHtml(formatMoney(order.store_subtotal ?? order.subtotal, currency))}</span></div>
          <div class="total-row"><span>Livraison boutique</span><span>${escapeHtml(formatMoney(order.store_shipping_total ?? order.shipping_total, currency))}</span></div>
          <div class="total-row final"><span>Total boutique</span><span>${escapeHtml(formatMoney(order.store_total ?? order.total, currency))}</span></div>
        </div>
      </section>
    `
    : `
      <section class="delivery-checklist">
        <div><span class="checkbox"></span> Articles vérifiés</div>
        <div><span class="checkbox"></span> Adresse confirmée</div>
        <div><span class="checkbox"></span> Colis emballé</div>
        <div><span class="checkbox"></span> Suivi renseigné</div>
      </section>
      <section class="signature-grid">
        <div><span>Préparé par</span></div>
        <div><span>Transporteur</span></div>
        <div><span>Client / réception</span></div>
      </section>
    `;

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(docTitle)} ${escapeHtml(shortId)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f3f4f6;
      color: #111827;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      justify-content: center;
      gap: 12px;
      padding: 14px;
      background: rgba(17, 24, 39, 0.92);
      backdrop-filter: blur(10px);
    }
    .toolbar button {
      border: 0;
      border-radius: 999px;
      padding: 10px 18px;
      background: #B91C1C;
      color: white;
      cursor: pointer;
      font-weight: 900;
    }
    .sheet {
      position: relative;
      width: min(100%, 210mm);
      margin: 24px auto;
      padding: 34px;
      background: white;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.14);
    }
    .sheet::before {
      content: "${escapeHtml(docTitle).toUpperCase()}";
      position: absolute;
      top: 46%;
      left: 50%;
      z-index: 0;
      color: rgba(17, 24, 39, 0.035);
      font-size: 82px;
      font-weight: 950;
      letter-spacing: 0.08em;
      pointer-events: none;
      transform: translate(-50%, -50%) rotate(-24deg);
      white-space: nowrap;
    }
    .sheet > * {
      position: relative;
      z-index: 1;
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 32px;
      border-bottom: 3px solid #111827;
      padding-bottom: 24px;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
      color: #047857;
      font-size: 13px;
      font-weight: 950;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .brand-mark {
      display: inline-flex;
      width: 38px;
      height: 38px;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: linear-gradient(135deg, #B91C1C, #059669);
      color: white;
      font-weight: 950;
      letter-spacing: -0.04em;
    }
    h1 {
      margin: 0;
      color: #111827;
      font-size: 34px;
      line-height: 1.05;
      letter-spacing: -0.04em;
    }
    .doc-pill {
      display: inline-flex;
      margin-top: 14px;
      border-radius: 999px;
      background: #ecfdf5;
      padding: 7px 12px;
      color: #047857;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .muted {
      color: #6b7280;
      font-size: 12px;
      font-weight: 700;
    }
    .store-block {
      margin-top: 18px;
      color: #374151;
      font-size: 12px;
      font-weight: 800;
    }
    .document-meta {
      min-width: 230px;
      border: 1px solid #e5e7eb;
      border-radius: 18px;
      padding: 16px;
      background: #f9fafb;
    }
    .document-meta .code {
      margin: 0 0 12px;
      color: #111827;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 18px;
      font-weight: 950;
      text-align: right;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 1px solid #e5e7eb;
      padding: 8px 0;
      font-size: 12px;
    }
    .meta-row:last-child { border-bottom: 0; }
    .meta-row span:first-child { color: #6b7280; font-weight: 800; }
    .meta-row span:last-child { color: #111827; font-weight: 950; text-align: right; }
    .document-grid {
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      gap: 18px;
      margin-top: 24px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      margin-top: 24px;
    }
    .card {
      border: 1px solid #e5e7eb;
      border-radius: 18px;
      padding: 18px;
      break-inside: avoid;
    }
    .card h2 {
      margin: 0 0 10px;
      color: #111827;
      font-size: 13px;
      font-weight: 950;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .card p {
      margin: 4px 0;
      color: #374151;
      font-size: 12px;
      font-weight: 700;
    }
    .status-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-top: 18px;
    }
    .status {
      border-radius: 16px;
      padding: 14px;
      background: #ecfdf5;
      color: #065f46;
      font-size: 12px;
      font-weight: 950;
    }
    .status span {
      display: block;
      margin-bottom: 4px;
      color: #047857;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .section-title {
      margin: 28px 0 0;
      color: #111827;
      font-size: 15px;
      font-weight: 950;
      letter-spacing: -0.02em;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
      break-inside: avoid;
    }
    th {
      background: #111827;
      color: white;
      padding: 12px 10px;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-align: left;
      text-transform: uppercase;
    }
    td {
      border-bottom: 1px solid #e5e7eb;
      padding: 12px 10px;
      color: #111827;
      font-size: 12px;
      vertical-align: top;
    }
    td small {
      display: block;
      margin-top: 4px;
      color: #6b7280;
      font-weight: 700;
    }
    .checkbox {
      display: inline-block;
      width: 18px;
      height: 18px;
      border: 2px solid #9ca3af;
      border-radius: 5px;
      vertical-align: middle;
    }
    .right { text-align: right; }
    .center { text-align: center; }
    .empty {
      padding: 24px;
      text-align: center;
      color: #6b7280;
      font-weight: 800;
    }
    .totals {
      display: flex;
      justify-content: flex-end;
      margin-top: 18px;
      break-inside: avoid;
    }
    .totals-box {
      width: min(100%, 340px);
      border: 1px solid #e5e7eb;
      border-radius: 18px;
      overflow: hidden;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 16px;
      color: #374151;
      font-size: 13px;
      font-weight: 800;
    }
    .total-row + .total-row { border-top: 1px solid #e5e7eb; }
    .total-row.final {
      background: #111827;
      color: white;
      font-size: 15px;
      font-weight: 950;
    }
    .delivery-checklist {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-top: 20px;
      break-inside: avoid;
    }
    .delivery-checklist div {
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 12px;
      color: #374151;
      font-size: 12px;
      font-weight: 850;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      margin-top: 22px;
      break-inside: avoid;
    }
    .signature-grid div {
      min-height: 82px;
      border: 1px dashed #9ca3af;
      border-radius: 16px;
      padding: 12px;
    }
    .signature-grid span {
      color: #6b7280;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin-top: 30px;
      border-top: 1px solid #e5e7eb;
      padding-top: 16px;
      color: #6b7280;
      font-size: 11px;
      font-weight: 700;
    }
    @media print {
      body { background: white; }
      .toolbar { display: none; }
      .sheet {
        width: 100%;
        margin: 0;
        padding: 0;
        box-shadow: none;
      }
      .card, table, .totals { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button type="button" onclick="window.print()">Imprimer ${escapeHtml(docTitle.toLowerCase())}</button>
  </div>
  <main class="sheet">
    <section class="header">
      <div>
        <div class="brand"><span class="brand-mark">${escapeHtml(marketplaceName.charAt(0).toUpperCase() || 'P')}</span>${escapeHtml(marketplaceName)}</div>
        <h1>${escapeHtml(docTitle)}</h1>
        <span class="doc-pill">${isInvoice ? 'Document avec montants' : 'Sans prix pour colis'}</span>
        <p class="muted">${escapeHtml(docSubtitle)}</p>
        <div class="store-block">${storeLines || escapeHtml(storeDisplayName(order))}</div>
      </div>
      <div class="document-meta">
        <p class="code">${escapeHtml(docCode)}</p>
        <div class="meta-row"><span>Document</span><span>${escapeHtml(docTitle)}</span></div>
        <div class="meta-row"><span>Commande</span><span>#${escapeHtml(shortId)}</span></div>
        <div class="meta-row"><span>Date commande</span><span>${escapeHtml(formatDateTime(order.created_at))}</span></div>
        <div class="meta-row"><span>Date impression</span><span>${escapeHtml(formatDateTime(new Date().toISOString()))}</span></div>
      </div>
    </section>

    <section class="status-grid">
      <div class="status"><span>Commande</span>${escapeHtml(statusLabel(order.status))}</div>
      <div class="status"><span>Paiement</span>${escapeHtml(paymentStatusLabel(order.payment_status))}</div>
      <div class="status"><span>Expédition</span>${escapeHtml(fulfillmentLabel(order.fulfillment_status))}</div>
    </section>

    <section class="document-grid">
      <div class="card">
        <h2>Client</h2>
        <p>${escapeHtml(customerName(order))}</p>
        <p>${escapeHtml(order.customer_email || 'Email non disponible')}</p>
        <p>${escapeHtml(order.customer_phone || order.shipping_address?.phone || 'Téléphone non disponible')}</p>
      </div>
      <div class="card">
        <h2>Adresse livraison</h2>
        <p>${shippingAddress}</p>
      </div>
    </section>

    <section class="grid">
      <div class="card">
        <h2>${isInvoice ? 'Paiement' : 'Référence commande'}</h2>
        <p>${isInvoice ? 'Méthode' : 'ID commande'}: ${escapeHtml(isInvoice ? order.payment_gateway?.replace(/_/g, ' ') || '—' : order.id)}</p>
        <p>${isInvoice ? 'Référence paiement' : 'Date commande'}: ${escapeHtml(isInvoice ? order.payment_reference || '—' : formatDateTime(order.created_at))}</p>
      </div>
      <div class="card">
        <h2>Expédition</h2>
        <p>Transporteur: ${escapeHtml(order.carrier || '—')}</p>
        <p>Tracking: ${escapeHtml(order.tracking_number || '—')}</p>
        <p>Expédiée: ${escapeHtml(formatDateTime(order.shipped_at))}</p>
        <p>Livrée: ${escapeHtml(formatDateTime(order.delivered_at))}</p>
      </div>
    </section>

    <h2 class="section-title">${isInvoice ? 'Articles facturés' : 'Articles à préparer'}</h2>
    <table>
      <thead>
        ${tableHeader}
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    ${totalsSection}

    <section class="footer">
      <span>${isInvoice ? `Facture générée depuis le tableau de bord vendeur ${escapeHtml(marketplaceName)}.` : 'Merci de vérifier les articles, l’adresse et le suivi avant remise au transporteur.'}</span>
      <span>Référence complète: ${escapeHtml(order.id)}</span>
    </section>
  </main>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 250);
  return true;
}

function fulfillmentLabel(status?: string | null) {
  if (!status) return 'Non expédiable';
  const labels: Record<string, string> = {
    pending: 'À expédier',
    shipped: 'Expédié',
    delivered: 'Livré',
    cancelled: 'Annulé',
  };
  return labels[status] || status;
}

function fulfillmentColor(status?: string | null) {
  switch (status) {
    case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'shipped': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'delivered': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-gray-50 text-gray-600 border-gray-200';
  }
}

function canFulfill(order: Order) {
  return order.fulfillment_status === 'pending' && !['fulfilled', 'delivered', 'cancelled'].includes(order.status);
}

function canMarkDelivered(order: Order) {
  return order.fulfillment_status === 'shipped' && !['delivered', 'cancelled'].includes(order.status);
}

function canCancelSellerFulfillment(order: Order) {
  return order.fulfillment_status === 'pending' && !['fulfilled', 'delivered', 'cancelled', 'refunded'].includes(order.status);
}

function getTrackingUrl(carrier?: string | null, trackingNumber?: string | null) {
  const tracking = trackingNumber?.trim();
  if (!tracking) return '';
  const normalizedCarrier = carrier?.trim().toLowerCase();
  const preset = CARRIER_OPTIONS.find((option) => option.value.toLowerCase() === normalizedCarrier);
  return preset ? preset.trackingUrl(tracking) : '';
}

function buildOrderTimeline(order: Order): TimelineStep[] {
  const isCancelled = order.status === 'cancelled' || order.fulfillment_status === 'cancelled';
  const isRefunded = order.status === 'refunded' || order.payment_status === 'refunded';
  const isPaid = order.payment_status === 'captured';
  const isProcessing = ['processing', 'fulfilled', 'delivered'].includes(order.status) || ['pending', 'shipped', 'delivered'].includes(order.fulfillment_status || '');
  const isShipped = order.fulfillment_status === 'shipped' || order.fulfillment_status === 'delivered' || order.status === 'fulfilled' || order.status === 'delivered';
  const isDelivered = order.fulfillment_status === 'delivered' || order.status === 'delivered';

  if (isCancelled || isRefunded) {
    return [
      { label: 'Commande créée', description: 'La commande a été enregistrée.', date: order.created_at, state: 'done' },
      {
        label: isRefunded ? 'Remboursement' : 'Annulation',
        description: isRefunded ? 'La commande est marquée comme remboursée.' : 'La commande est marquée comme annulée.',
        date: order.delivered_at || order.shipped_at || order.created_at,
        state: 'failed',
      },
    ];
  }

  return [
    { label: 'Commande créée', description: 'La commande a été enregistrée.', date: order.created_at, state: 'done' },
    {
      label: 'Paiement confirmé',
      description: isPaid ? 'Le paiement est capturé.' : 'Le paiement attend confirmation.',
      date: isPaid ? order.created_at : undefined,
      state: isPaid ? 'done' : 'current',
    },
    {
      label: 'Préparation',
      description: isProcessing ? 'La commande est prête pour le traitement vendeur.' : 'En attente de paiement avant préparation.',
      state: isProcessing ? 'done' : 'pending',
    },
    {
      label: 'Expédition',
      description: isShipped ? `Expédiée${order.carrier ? ` via ${order.carrier}` : ''}.` : 'En attente de numéro de suivi.',
      date: order.shipped_at,
      state: isShipped ? 'done' : isProcessing ? 'current' : 'pending',
    },
    {
      label: 'Livraison',
      description: isDelivered ? 'La livraison est confirmée.' : 'La livraison sera confirmée plus tard.',
      date: order.delivered_at,
      state: isDelivered ? 'done' : 'pending',
    },
  ];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [meta, setMeta] = useState<OrderMeta>({ page: 1, limit: 20, total: 0, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [fulfillmentStatusFilter, setFulfillmentStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);
  const [fulfillOrderTarget, setFulfillOrderTarget] = useState<Order | null>(null);
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [fulfillingId, setFulfillingId] = useState('');
  const [statusActionId, setStatusActionId] = useState('');
  const [exportingOrders, setExportingOrders] = useState(false);
  const [startingChatId, setStartingChatId] = useState('');
  const [sellerNote, setSellerNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteFeedback, setNoteFeedback] = useState('');
  const [marketplaceName, setMarketplaceName] = useState('PandaMarket');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (statusFilter) params.set('status', statusFilter);
      if (paymentStatusFilter) params.set('payment_status', paymentStatusFilter);
      if (fulfillmentStatusFilter) params.set('fulfillment_status', fulfillmentStatusFilter);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetchWithCsrf(`/api/pd/orders/store?${params.toString()}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.data || []);
        setTotalPages(data.meta?.total_pages || 1);
        setMeta(data.meta || { page, limit: 20, total: 0, total_pages: 1 });
      } else {
        setError(await getErrorMessage(res, 'Erreur lors du chargement des commandes'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, fulfillmentStatusFilter, page, paymentStatusFilter, search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    let active = true;
    async function fetchMarketplaceSettings() {
      try {
        const res = await fetchWithCsrf('/api/pd/marketplace/settings', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (active) setMarketplaceName(data.data?.marketplace_name || 'PandaMarket');
      } catch {
        if (active) setMarketplaceName('PandaMarket');
      }
    }
    fetchMarketplaceSettings();
    return () => {
      active = false;
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handlePaymentStatusChange = (value: string) => {
    setPaymentStatusFilter(value);
    setPage(1);
  };

  const handleFulfillmentStatusChange = (value: string) => {
    setFulfillmentStatusFilter(value);
    setPage(1);
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    setPage(1);
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPaymentStatusFilter('');
    setFulfillmentStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const openFulfillmentModal = (order: Order) => {
    setFulfillOrderTarget(order);
    setCarrier(order.carrier || '');
    setTrackingNumber(order.tracking_number || '');
  };

  const openOrderDetail = async (order: Order) => {
    setSelectedOrder(order);
    setSellerNote(order.seller_note?.body || '');
    setNoteFeedback('');
    setLoadingOrderDetail(true);
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/store/${order.id}`, { credentials: 'include' });
      if (!res.ok) {
        setError(await getErrorMessage(res, 'Erreur lors du chargement du détail'));
        return;
      }
      const data = await res.json();
      const detail = data.order || order;
      setSelectedOrder(detail);
      setSellerNote(detail.seller_note?.body || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoadingOrderDetail(false);
    }
  };

  const fulfillOrder = async () => {
    if (!fulfillOrderTarget) return;
    const order = fulfillOrderTarget;
    setFulfillingId(order.id);
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/${order.id}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          carrier: carrier.trim() || undefined,
          tracking_number: trackingNumber.trim() || undefined,
        }),
      });

      if (res.ok) {
        setFulfillOrderTarget(null);
        setCarrier('');
        setTrackingNumber('');
        await fetchOrders();
        if (selectedOrder?.id === order.id) {
          await openOrderDetail(order);
        }
      } else {
        setError(await getErrorMessage(res, 'Erreur lors de l’expédition'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setFulfillingId('');
    }
  };

  const refreshOrderAfterStatusChange = async (order: Order) => {
    await fetchOrders();
    if (selectedOrder?.id === order.id) {
      await openOrderDetail(order);
    }
  };

  const markOrderDelivered = async (order: Order) => {
    setStatusActionId(order.id);
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/${order.id}/deliver`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        setError(await getErrorMessage(res, 'Erreur lors du marquage livré'));
        return;
      }
      await refreshOrderAfterStatusChange(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setStatusActionId('');
    }
  };

  const cancelSellerFulfillment = async (order: Order) => {
    const reason = window.prompt('Pourquoi annuler la partie de commande liée à votre boutique ?');
    if (!reason?.trim()) return;
    setStatusActionId(order.id);
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/${order.id}/fulfillment/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!res.ok) {
        setError(await getErrorMessage(res, 'Erreur lors de l’annulation'));
        return;
      }
      await refreshOrderAfterStatusChange(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setStatusActionId('');
    }
  };

  const exportFilteredOrders = async () => {
    setExportingOrders(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '100',
      });
      if (statusFilter) params.set('status', statusFilter);
      if (paymentStatusFilter) params.set('payment_status', paymentStatusFilter);
      if (fulfillmentStatusFilter) params.set('fulfillment_status', fulfillmentStatusFilter);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetchWithCsrf(`/api/pd/orders/store?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        setError(await getErrorMessage(res, 'Erreur lors de l’export'));
        return;
      }
      const data = await res.json();
      const rows = (data.data || []) as Order[];
      const columns: CsvColumn[] = [
        { key: 'id', label: 'Order ID' },
        { key: 'created_at', label: 'Date', formatter: (value) => formatDateTime(String(value || '')) },
        { key: 'customer', label: 'Customer' },
        { key: 'customer_email', label: 'Email' },
        { key: 'status', label: 'Order Status', formatter: (value) => statusLabel(String(value || '')) },
        { key: 'payment_status', label: 'Payment Status', formatter: (value) => paymentStatusLabel(String(value || '')) },
        { key: 'fulfillment_status', label: 'Fulfillment', formatter: (value) => fulfillmentLabel(String(value || '')) },
        { key: 'carrier', label: 'Carrier' },
        { key: 'tracking_number', label: 'Tracking Number' },
        { key: 'store_total', label: 'Store Total' },
        { key: 'currency', label: 'Currency' },
      ];
      exportToCsv(
        rows.map((order) => ({
          ...order,
          customer: customerName(order),
          store_total: formatMoney(order.store_total ?? order.total, order.currency || 'TND'),
        })) as Record<string, unknown>[],
        `seller-orders-${new Date().toISOString().slice(0, 10)}.csv`,
        columns,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setExportingOrders(false);
    }
  };

  const saveSellerNote = async () => {
    if (!selectedOrder) return;
    setSavingNote(true);
    setNoteFeedback('');
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/store/${selectedOrder.id}/note`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body: sellerNote }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || 'Erreur lors de la sauvegarde de la note');
      }
      setSelectedOrder((current) => current ? { ...current, seller_note: data.note } : current);
      setSellerNote(data.note?.body || '');
      setNoteFeedback('Note interne sauvegardée.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setSavingNote(false);
    }
  };

  const printSelectedOrder = (kind: PrintDocumentKind) => {
    if (!selectedOrder) return;
    if (loadingOrderDetail) {
      setError('Le détail de la commande est encore en chargement.');
      return;
    }
    const opened = openOrderPrintDocument(selectedOrder, kind, marketplaceName);
    if (!opened) {
      setError('Impossible d’ouvrir la fenêtre d’impression. Vérifiez que les popups sont autorisés.');
    }
  };

  const startBuyerChat = async (order: Order) => {
    setStartingChatId(order.id);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/chats/store/buyer-seller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          order_id: order.id,
          subject: `Order #${order.id.slice(-8).toUpperCase()}`,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message || 'Impossible de démarrer la conversation');
      window.location.href = `/hub/dashboard/messages?conversation=${encodeURIComponent(data.conversation.id)}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversation indisponible');
    } finally {
      setStartingChatId('');
    }
  };

  const summary = meta.summary;
  const hasActiveFilters = Boolean(search || statusFilter || paymentStatusFilter || fulfillmentStatusFilter || dateFrom || dateTo);
  const activeFilterCount = [search, statusFilter, paymentStatusFilter, fulfillmentStatusFilter, dateFrom, dateTo].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-900 p-6 text-white shadow-2xl shadow-slate-900/10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-[80px]" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black text-amber-100">
              <Truck className="h-4 w-4" />
              Order Management
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight">Commandes</h1>
            <p className="mt-1 text-sm text-amber-50/70">
              Gérez et expédiez les commandes de vos clients.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchOrders()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-900 shadow transition-all hover:-translate-y-0.5 hover:bg-amber-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
          <X className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Revenu 30j', value: formatMoney(summary?.revenue_30d ?? 0), icon: TrendingUp, gradient: 'from-amber-500 to-teal-600' },
          { label: "Aujourd'hui", value: formatMoney(summary?.revenue_today ?? 0), icon: CalendarDays, gradient: 'from-blue-500 to-indigo-600' },
          { label: 'À expédier', value: String(summary?.to_ship ?? 0), icon: PackageCheck, gradient: 'from-amber-500 to-orange-600' },
          { label: 'AOV', value: formatMoney(summary?.average_order_value ?? 0), icon: CreditCard, gradient: 'from-violet-500 to-purple-600' },
          { label: 'Commandes', value: String(summary?.total_orders ?? meta.total), icon: Truck, gradient: 'from-slate-500 to-slate-700' },
        ].map((item) => (
          <div key={item.label} className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-400">{item.label}</span>
              <div className={`rounded-xl bg-gradient-to-br ${item.gradient} p-2.5 text-white shadow-lg`}>
                <item.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black text-gray-900">{item.value}</p>
            <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${item.gradient} opacity-0 transition-opacity group-hover:opacity-100`} />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="space-y-4 border-b border-gray-100 bg-gray-50/30 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search by order ID or customer..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm font-medium focus:ring-2 focus:ring-[#B91C1C]/20 focus:border-[#B91C1C] outline-none transition-all"
              />
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
              <Filter className="w-4 h-4 mr-2" />
              <select
                value={statusFilter}
                onChange={(event) => handleStatusChange(event.target.value)}
                className="min-w-[160px] flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-600 outline-none transition-colors hover:bg-gray-50 lg:flex-none"
              >
                <option value="">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="payment_required">Paiement requis</option>
                <option value="processing">En cours</option>
                <option value="fulfilled">Expédié</option>
                <option value="delivered">Livré</option>
                <option value="cancelled">Annulé</option>
              </select>
              <select
                value={paymentStatusFilter}
                onChange={(event) => handlePaymentStatusChange(event.target.value)}
                className="min-w-[160px] flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-600 outline-none transition-colors hover:bg-gray-50 lg:flex-none"
              >
                <option value="">Tous paiements</option>
                <option value="pending">En attente</option>
                <option value="captured">Payé</option>
                <option value="failed">Échec</option>
                <option value="refunded">Remboursé</option>
              </select>
              <select
                value={fulfillmentStatusFilter}
                onChange={(event) => handleFulfillmentStatusChange(event.target.value)}
                className="min-w-[160px] flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-600 outline-none transition-colors hover:bg-gray-50 lg:flex-none"
              >
                <option value="">Tous fulfillment</option>
                <option value="pending">À expédier</option>
                <option value="shipped">Expédié</option>
                <option value="delivered">Livré</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-3 sm:grid-cols-2 lg:flex">
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-500">
                <CalendarDays className="h-4 w-4 text-gray-400" />
                <span>Du</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => handleDateFromChange(event.target.value)}
                  className="min-w-0 outline-none"
                />
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-500">
                <CalendarDays className="h-4 w-4 text-gray-400" />
                <span>Au</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => handleDateToChange(event.target.value)}
                  className="min-w-0 outline-none"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
                {meta.total} résultat{meta.total !== 1 ? 's' : ''}{hasActiveFilters ? ` · ${activeFilterCount} filtre${activeFilterCount > 1 ? 's' : ''}` : ''}
              </span>
              <button
                type="button"
                onClick={() => void exportFilteredOrders()}
                disabled={exportingOrders || loading}
                className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-bold text-amber-700 hover:border-amber-500 hover:bg-amber-50 disabled:opacity-50"
              >
                {exportingOrders ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export CSV
              </button>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 hover:border-[#B91C1C] hover:text-[#B91C1C]"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#B91C1C] animate-spin" />
              <span className="ml-2 text-gray-500">Chargement des commandes...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 rounded-2xl bg-gray-100 p-4">
                <Truck className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-sm font-bold text-gray-500">Aucune commande pour le moment</p>
              <p className="mt-1 text-xs text-gray-400">Les commandes de vos clients apparaîtront ici</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-[11px] uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-3.5 font-bold">ID Commande</th>
                  <th className="px-6 py-3.5 font-bold">Date</th>
                  <th className="px-6 py-3.5 font-bold">Client</th>
                  <th className="px-6 py-3.5 font-bold">Paiement</th>
                  <th className="px-6 py-3.5 font-bold">Total</th>
                  <th className="px-6 py-3.5 font-bold">Statut</th>
                  <th className="px-6 py-3.5 font-bold">Fulfillment</th>
                  <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#B91C1C]/[0.02] transition-colors group border-b border-gray-50 last:border-0">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-lg bg-gray-50 px-2.5 py-1 font-mono text-xs font-bold text-gray-700 group-hover:bg-[#B91C1C]/10 group-hover:text-[#B91C1C] transition-colors">
                        #{order.id.slice(-8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString('fr-TN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <p className="font-semibold text-gray-900">{customerName(order)}</p>
                      {order.customer_email && <p className="text-xs text-gray-500">{order.customer_email}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <p className="font-semibold capitalize text-gray-700">
                        {order.payment_gateway?.replace('_', ' ') || '—'}
                      </p>
                      <span className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${paymentStatusColor(order.payment_status)}`}>
                        {paymentStatusLabel(order.payment_status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <span className="font-black">{formatMoney(order.store_total ?? order.total, order.currency || 'TND')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${fulfillmentColor(order.fulfillment_status)}`}>
                        {fulfillmentLabel(order.fulfillment_status)}
                      </span>
                      {order.tracking_number && (
                        getTrackingUrl(order.carrier, order.tracking_number) ? (
                          <a
                            href={getTrackingUrl(order.carrier, order.tracking_number)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800"
                          >
                            {order.tracking_number}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <p className="mt-1 text-xs font-semibold text-gray-500">{order.tracking_number}</p>
                        )
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => void openOrderDetail(order)}
                          className="p-2 text-gray-400 hover:text-[#B91C1C] hover:bg-[#B91C1C]/5 rounded-lg transition-colors"
                          title="Voir détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startBuyerChat(order)}
                          disabled={startingChatId === order.id}
                          className="p-2 text-gray-400 hover:text-[#B91C1C] hover:bg-[#B91C1C]/5 rounded-lg transition-colors disabled:opacity-40"
                          title="Message buyer"
                        >
                          {startingChatId === order.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <MessageSquare className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => openFulfillmentModal(order)}
                          disabled={fulfillingId === order.id || !canFulfill(order)}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-40"
                          title="Marquer expédié"
                        >
                          {fulfillingId === order.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Truck className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void markOrderDelivered(order)}
                          disabled={statusActionId === order.id || !canMarkDelivered(order)}
                          className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-40"
                          title="Marquer livré"
                        >
                          {statusActionId === order.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
            <span className="text-xs font-bold text-gray-400">
              Page {page} sur {totalPages} · {meta.total} commande{meta.total !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50 disabled:opacity-40"
              >
                ← Précédent
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-xl border border-gray-200 bg-gray-900 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-gray-800 disabled:opacity-40"
              >
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-gray-100 bg-gray-50/50 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black text-gray-900">Détails commande</h2>
                  <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-xs font-bold text-gray-600">#{selectedOrder.id.slice(-8).toUpperCase()}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-gray-500">Créée le {formatDateTime(selectedOrder.created_at)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => printSelectedOrder('invoice')}
                  disabled={loadingOrderDetail}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-600 transition-colors hover:border-[#B91C1C] hover:text-[#B91C1C] disabled:opacity-50"
                >
                  <Printer className="h-4 w-4" />
                  Facture
                </button>
                <button
                  type="button"
                  onClick={() => printSelectedOrder('delivery_slip')}
                  disabled={loadingOrderDetail}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 transition-colors hover:border-amber-500 hover:bg-amber-100 disabled:opacity-50"
                >
                  <ReceiptText className="h-4 w-4" />
                  Bon livraison
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="max-h-[calc(90vh-78px)] overflow-y-auto p-6">
              {loadingOrderDetail ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-7 w-7 animate-spin text-[#B91C1C]" />
                </div>
              ) : (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-gray-400">Statut</p>
                        <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedOrder.status)}`}>
                          {statusLabel(selectedOrder.status)}
                        </span>
                      </div>
                      <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-gray-400">Paiement</p>
                        <span className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${paymentStatusColor(selectedOrder.payment_status)}`}>
                          {paymentStatusLabel(selectedOrder.payment_status)}
                        </span>
                      </div>
                      <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-gray-400">Fulfillment</p>
                        <span className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${fulfillmentColor(selectedOrder.fulfillment_status)}`}>
                          {fulfillmentLabel(selectedOrder.fulfillment_status)}
                        </span>
                      </div>
                      <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-gray-400">Votre total</p>
                        <p className="mt-2 text-lg font-black text-gray-900">{formatMoney(selectedOrder.store_total ?? selectedOrder.total, selectedOrder.currency || 'TND')}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-sm font-black text-gray-900">Timeline commande</h3>
                        <span className="rounded-full bg-gray-50 px-3 py-1 text-xs font-bold text-gray-500">{buildOrderTimeline(selectedOrder).filter((step) => step.state === 'done').length}/{buildOrderTimeline(selectedOrder).length} étapes</span>
                      </div>
                      <div className="mt-5 space-y-4">
                        {buildOrderTimeline(selectedOrder).map((step, index, steps) => (
                          <div key={`${step.label}-${index}`} className="relative flex gap-4">
                            {index < steps.length - 1 && <div className="absolute left-[18px] top-9 h-full w-px bg-gray-100" />}
                            <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                              step.state === 'failed'
                                ? 'border-red-200 bg-red-50 text-red-600'
                                : step.state === 'done'
                                  ? 'border-amber-200 bg-amber-50 text-amber-600'
                                  : step.state === 'current'
                                    ? 'border-amber-200 bg-amber-50 text-amber-600'
                                    : 'border-gray-200 bg-gray-50 text-gray-400'
                            }`}>
                              {step.state === 'failed' ? (
                                <Ban className="h-4 w-4" />
                              ) : step.state === 'done' ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <Clock3 className="h-4 w-4" />
                              )}
                            </div>
                            <div className="min-w-0 pb-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-black text-gray-900">{step.label}</p>
                                <span className="text-xs font-semibold text-gray-400">{formatDateTime(step.date)}</span>
                              </div>
                              <p className="mt-1 text-sm font-semibold text-gray-500">{step.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-4">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-[#B91C1C]" />
                        <h3 className="text-sm font-black text-gray-900">Articles de votre boutique</h3>
                      </div>
                      <div className="mt-4 space-y-3">
                        {(selectedOrder.items || []).length > 0 ? (
                          selectedOrder.items?.map((item) => (
                            <div key={item.id || `${item.product_id}-${item.variant_id}`} className="flex gap-3 rounded-2xl bg-gray-50 p-3">
                              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-200">
                                {item.thumbnail && (
                                  <div
                                    aria-label={item.product_title || 'Product image'}
                                    role="img"
                                    className="h-full w-full bg-cover bg-center"
                                    style={{ backgroundImage: `url(${item.thumbnail})` }}
                                  />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-black text-gray-900">{item.product_title || 'Produit'}</p>
                                <p className="mt-1 text-xs font-semibold text-gray-500">
                                  Qté {toNumber(item.quantity)} · {formatMoney(item.unit_price, selectedOrder.currency || 'TND')}
                                  {item.variant_sku ? ` · SKU ${item.variant_sku}` : ''}
                                </p>
                              </div>
                              <p className="text-sm font-black text-gray-900">{formatMoney(item.subtotal, selectedOrder.currency || 'TND')}</p>
                            </div>
                          ))
                        ) : (
                          <p className="rounded-2xl bg-gray-50 p-4 text-sm font-semibold text-gray-500">Détail des articles indisponible.</p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-gray-100 bg-white p-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-[#B91C1C]" />
                          <h3 className="text-sm font-black text-gray-900">Client</h3>
                        </div>
                        <div className="mt-3 space-y-2 text-sm">
                          <p className="font-bold text-gray-900">{customerName(selectedOrder)}</p>
                          <p className="inline-flex items-center gap-2 text-gray-600"><Mail className="h-3.5 w-3.5" />{selectedOrder.customer_email || 'Email non disponible'}</p>
                          <p className="inline-flex items-center gap-2 text-gray-600"><Phone className="h-3.5 w-3.5" />{selectedOrder.customer_phone || 'Téléphone non disponible'}</p>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-gray-100 bg-white p-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#B91C1C]" />
                          <h3 className="text-sm font-black text-gray-900">Adresse livraison</h3>
                        </div>
                        {selectedOrder.shipping_address ? (
                          <div className="mt-3 space-y-1 text-sm font-semibold text-gray-600">
                            <p>{[selectedOrder.shipping_address.first_name, selectedOrder.shipping_address.last_name].filter(Boolean).join(' ')}</p>
                            <p>{selectedOrder.shipping_address.address_line_1}</p>
                            {selectedOrder.shipping_address.address_line_2 && <p>{selectedOrder.shipping_address.address_line_2}</p>}
                            <p>{[selectedOrder.shipping_address.postal_code, selectedOrder.shipping_address.city].filter(Boolean).join(' ')}</p>
                            <p>{selectedOrder.shipping_address.country || 'TN'}</p>
                            {selectedOrder.shipping_address.phone && <p>{selectedOrder.shipping_address.phone}</p>}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm font-semibold text-gray-500">Pas d’adresse requise.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-[#B91C1C]" />
                        <h3 className="text-sm font-black text-gray-900">Paiement</h3>
                      </div>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Méthode</span>
                          <span className="font-bold text-gray-900">{selectedOrder.payment_gateway?.replace('_', ' ') || '—'}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Statut</span>
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${paymentStatusColor(selectedOrder.payment_status)}`}>{paymentStatusLabel(selectedOrder.payment_status)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Référence</span>
                          <span className="truncate font-bold text-gray-900">{selectedOrder.payment_reference || '—'}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Sous-total boutique</span>
                          <span className="font-bold text-gray-900">{formatMoney(selectedOrder.store_subtotal ?? selectedOrder.subtotal, selectedOrder.currency || 'TND')}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Livraison boutique</span>
                          <span className="font-bold text-gray-900">{formatMoney(selectedOrder.store_shipping_total ?? selectedOrder.shipping_total, selectedOrder.currency || 'TND')}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-2">
                          <div className="flex justify-between gap-4">
                            <span className="font-black text-gray-700">Total boutique</span>
                            <span className="font-black text-gray-900">{formatMoney(selectedOrder.store_total ?? selectedOrder.total, selectedOrder.currency || 'TND')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-[#B91C1C]" />
                        <h3 className="text-sm font-black text-gray-900">Expédition</h3>
                      </div>
                      <div className="mt-3 space-y-2 text-sm">
                        <p className="font-bold text-gray-900">{fulfillmentLabel(selectedOrder.fulfillment_status)}</p>
                        <p className="text-gray-600">Transporteur: {selectedOrder.carrier || '—'}</p>
                        {selectedOrder.tracking_number ? (
                          getTrackingUrl(selectedOrder.carrier, selectedOrder.tracking_number) ? (
                            <a
                              href={getTrackingUrl(selectedOrder.carrier, selectedOrder.tracking_number)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-amber-700 hover:text-amber-800"
                            >
                              Tracking: {selectedOrder.tracking_number}
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <p className="text-gray-600">Tracking: {selectedOrder.tracking_number}</p>
                          )
                        ) : (
                          <p className="text-gray-600">Tracking: —</p>
                        )}
                        {selectedOrder.shipped_at && <p className="text-gray-600">Expédiée le {formatDateTime(selectedOrder.shipped_at)}</p>}
                        {selectedOrder.delivered_at && <p className="text-gray-600">Livrée le {formatDateTime(selectedOrder.delivered_at)}</p>}
                      </div>
                      <div className="mt-4 space-y-2">
                        {canFulfill(selectedOrder) && (
                          <button
                            type="button"
                            onClick={() => openFulfillmentModal(selectedOrder)}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-4 py-3 text-sm font-black text-white transition hover:bg-[#991B1B]"
                          >
                            <Truck className="h-4 w-4" />
                            Marquer expédiée
                          </button>
                        )}
                        {canMarkDelivered(selectedOrder) && (
                          <button
                            type="button"
                            onClick={() => void markOrderDelivered(selectedOrder)}
                            disabled={statusActionId === selectedOrder.id}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 py-3 text-sm font-black text-white transition hover:bg-amber-700 disabled:opacity-60"
                          >
                            {statusActionId === selectedOrder.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Marquer livrée
                          </button>
                        )}
                        {canCancelSellerFulfillment(selectedOrder) && (
                          <button
                            type="button"
                            onClick={() => void cancelSellerFulfillment(selectedOrder)}
                            disabled={statusActionId === selectedOrder.id}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                          >
                            {statusActionId === selectedOrder.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                            Annuler cette expédition
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <StickyNote className="h-4 w-4 text-amber-700" />
                          <h3 className="text-sm font-black text-amber-950">Note interne vendeur</h3>
                        </div>
                        {selectedOrder.seller_note?.updated_at && (
                          <span className="text-[11px] font-bold text-amber-700">
                            Modifiée {formatDateTime(selectedOrder.seller_note.updated_at)}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs font-semibold text-amber-800/80">
                        Visible uniquement par votre équipe boutique. Le client et les autres vendeurs ne la voient pas.
                      </p>
                      <textarea
                        value={sellerNote}
                        onChange={(event) => {
                          setSellerNote(event.target.value);
                          setNoteFeedback('');
                        }}
                        rows={5}
                        maxLength={5000}
                        placeholder="Ex: Client préfère livraison matin, vérifier emballage fragile, appeler avant expédition..."
                        className="mt-4 w-full resize-none rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-200/40"
                      />
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs font-bold text-amber-700">{sellerNote.length}/5000</span>
                        {noteFeedback && <span className="text-xs font-black text-amber-700">{noteFeedback}</span>}
                        <button
                          type="button"
                          onClick={() => void saveSellerNote()}
                          disabled={savingNote}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-amber-700 disabled:opacity-60"
                        >
                          {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Sauvegarder note
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                      <div className="flex items-center gap-2">
                        <ReceiptText className="h-4 w-4 text-amber-700" />
                        <h3 className="text-sm font-black text-amber-900">Actions vendeur</h3>
                      </div>
                      <div className="mt-4 space-y-2">
                        <button
                          type="button"
                          onClick={() => void startBuyerChat(selectedOrder)}
                          disabled={startingChatId === selectedOrder.id}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
                        >
                          {startingChatId === selectedOrder.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                          Message client
                        </button>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => printSelectedOrder('invoice')}
                            disabled={loadingOrderDetail}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-600 px-4 py-3 text-sm font-black text-white transition hover:bg-amber-700 disabled:opacity-50"
                          >
                            <Printer className="h-4 w-4" />
                            Facture
                          </button>
                          <button
                            type="button"
                            onClick={() => printSelectedOrder('delivery_slip')}
                            disabled={loadingOrderDetail}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-black text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                          >
                            <ReceiptText className="h-4 w-4" />
                            Bon livraison
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {fulfillOrderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900">Marquer comme expédiée</h2>
                <p className="mt-1 inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-xs font-bold text-gray-600">#{fulfillOrderTarget.id.slice(-8).toUpperCase()}</p>
              </div>
              <button
                type="button"
                onClick={() => setFulfillOrderTarget(null)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Transporteur</label>
                <select
                  value={carrier}
                  onChange={(event) => setCarrier(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-[#B91C1C] focus:bg-white focus:ring-4 focus:ring-[#B91C1C]/10"
                >
                  <option value="">Sélectionner un transporteur</option>
                  {CARRIER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                  <option value="Autre">Autre / manuel</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Numéro de suivi</label>
                <input
                  value={trackingNumber}
                  onChange={(event) => setTrackingNumber(event.target.value)}
                  placeholder="Tracking number"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-[#B91C1C] focus:bg-white focus:ring-4 focus:ring-[#B91C1C]/10"
                />
                {getTrackingUrl(carrier, trackingNumber) && (
                  <a
                    href={getTrackingUrl(carrier, trackingNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-black text-amber-700 hover:text-amber-800"
                  >
                    Prévisualiser le lien de suivi
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                Cette action expédie la partie de commande liée à votre boutique. Si toutes les boutiques ont expédié, la commande passera en statut expédié.
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setFulfillOrderTarget(null)}
                  className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-black text-gray-600 transition hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void fulfillOrder()}
                  disabled={fulfillingId === fulfillOrderTarget.id}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-5 py-3 text-sm font-black text-white transition hover:bg-[#991B1B] disabled:opacity-60"
                >
                  {fulfillingId === fulfillOrderTarget.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                  Confirmer l’expédition
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
