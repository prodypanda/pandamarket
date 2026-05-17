'use client';

import { fetchWithCsrf } from '@/lib/api';
import { exportToCsv, type CsvColumn } from '@/lib/csv-export';
import { useCallback, useEffect, useState } from 'react';
import { Search, Filter, Eye, Truck, Loader2, MessageSquare, X, CalendarDays, CreditCard, PackageCheck, RefreshCw, TrendingUp, CheckCircle2, Clock3, Ban, ReceiptText, Package, Mail, Phone, MapPin, Printer, StickyNote, Save, Download, ExternalLink, Upload } from 'lucide-react';

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
  open_report_count?: string | number | null;
  customer_order_count?: string | number | null;
  customer_lifetime_value?: string | number | null;
  customer_last_order_at?: string | null;
  items?: OrderItem[];
  seller_note?: SellerOrderNote | null;
  refunds?: SellerOrderRefund[];
  shipments?: SellerOrderShipment[];
  delivery_proofs?: SellerDeliveryProof[];
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

interface SellerOrderRefund {
  id: string;
  order_id: string;
  store_id: string;
  requested_by?: string | null;
  amount: string | number;
  currency: string;
  reason_code: string;
  reason?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface SellerOrderShipment {
  id: string;
  order_id: string;
  fulfillment_id?: string | null;
  store_id: string;
  provider: string;
  tracking_number: string;
  label_url?: string | null;
  status: string;
  estimated_delivery?: string | null;
  delivered_at?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface SellerDeliveryProof {
  id: string;
  order_id: string;
  fulfillment_id?: string | null;
  store_id: string;
  shipment_id?: string | null;
  captured_by?: string | null;
  proof_url?: string | null;
  received_by?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
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
  refund_rate: number;
  average_fulfillment_hours: number;
  fulfillment_sla_rate: number;
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

type OrderColumnKey = 'id' | 'date' | 'customer' | 'payment' | 'total' | 'status' | 'fulfillment' | 'actions';

interface BulkFulfillmentDraft {
  carrier: string;
  trackingNumber: string;
}

interface SavedFilterPreset {
  id: string;
  name: string;
  filters: {
    search: string;
    statusFilter: string;
    paymentGatewayFilter: string;
    paymentStatusFilter: string;
    fulfillmentStatusFilter: string;
    dateFrom: string;
    dateTo: string;
    customerFilter: string;
    productFilter: string;
    channelFilter: string;
    countryFilter: string;
    hasDisputeFilter: boolean;
  };
}

const ORDERS_COLUMN_STORAGE_KEY = 'pd:seller-orders:columns';
const ORDERS_PRESETS_STORAGE_KEY = 'pd:seller-orders:filter-presets';

const ORDER_COLUMNS: { key: OrderColumnKey; label: string; required?: boolean }[] = [
  { key: 'id', label: 'ID Commande', required: true },
  { key: 'date', label: 'Date' },
  { key: 'customer', label: 'Client' },
  { key: 'payment', label: 'Paiement' },
  { key: 'total', label: 'Total' },
  { key: 'status', label: 'Statut' },
  { key: 'fulfillment', label: 'Fulfillment' },
  { key: 'actions', label: 'Actions', required: true },
];

const DEFAULT_VISIBLE_COLUMNS = ORDER_COLUMNS.reduce((acc, column) => {
  acc[column.key] = true;
  return acc;
}, {} as Record<OrderColumnKey, boolean>);

const CARRIER_OPTIONS = [
  { label: 'Aramex', value: 'Aramex', trackingUrl: (tracking: string) => `https://www.aramex.com/track/results?ShipmentNumber=${encodeURIComponent(tracking)}` },
  { label: 'DHL', value: 'DHL', trackingUrl: (tracking: string) => `https://www.dhl.com/tn-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encodeURIComponent(tracking)}` },
  { label: 'FedEx', value: 'FedEx', trackingUrl: (tracking: string) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(tracking)}` },
  { label: 'UPS', value: 'UPS', trackingUrl: (tracking: string) => `https://www.ups.com/track?tracknum=${encodeURIComponent(tracking)}` },
  { label: 'La Poste Tunisienne', value: 'La Poste Tunisienne', trackingUrl: (tracking: string) => `https://www.poste.tn/suivi?code=${encodeURIComponent(tracking)}` },
];

const REFUND_REASON_OPTIONS = [
  { value: 'customer_request', label: 'Demande client' },
  { value: 'out_of_stock', label: 'Rupture de stock' },
  { value: 'damaged_item', label: 'Article endommagé' },
  { value: 'late_delivery', label: 'Livraison en retard' },
  { value: 'duplicate_order', label: 'Commande dupliquée' },
  { value: 'goodwill', label: 'Geste commercial' },
  { value: 'other', label: 'Autre' },
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

const refundReasonLabel = (reasonCode: string) => (
  REFUND_REASON_OPTIONS.find((option) => option.value === reasonCode)?.label || reasonCode
);

const refundStatusColor = (status: string) => {
  switch (status) {
    case 'processed': return 'bg-green-50 text-green-700 border-green-200';
    case 'approved': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'rejected': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-amber-50 text-amber-700 border-amber-200';
  }
};

const refundStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    requested: 'Demandé',
    approved: 'Approuvé',
    processed: 'Traité',
    rejected: 'Rejeté',
  };
  return labels[status] || status;
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

function formatPercent(value: unknown) {
  return `${toNumber(value).toFixed(1)}%`;
}

function formatHours(value: unknown) {
  const hours = toNumber(value);
  if (hours <= 0) return '—';
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}j`;
}

function refundRequestedTotal(order: Order) {
  return (order.refunds || [])
    .filter((refund) => ['requested', 'approved', 'processed'].includes(refund.status))
    .reduce((sum, refund) => sum + toNumber(refund.amount), 0);
}

function refundableRemaining(order: Order) {
  return Math.max(0, toNumber(order.store_total ?? order.total) - refundRequestedTotal(order));
}

function canRequestRefund(order: Order) {
  return order.payment_status === 'captured' && refundableRemaining(order) > 0;
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

function latestShipment(order: Order) {
  return (order.shipments || [])[0] || null;
}

function shipmentCarrierLabel(provider?: string | null) {
  if (!provider) return '—';
  if (provider === 'aramex') return 'Aramex';
  if (provider === 'laposte') return 'La Poste Tunisienne';
  return provider;
}

function canGenerateShippingLabel(order: Order) {
  return Boolean(order.fulfillment_id && order.shipping_address && !['delivered', 'cancelled'].includes(order.fulfillment_status || ''));
}

function openShipmentLabelDocument(order: Order, shipment: SellerOrderShipment, marketplaceName: string) {
  if (typeof window === 'undefined') return false;
  if (shipment.label_url) {
    return Boolean(window.open(shipment.label_url, '_blank', 'noopener,noreferrer'));
  }

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return false;
  const recipientLines = formatAddressLines(order.shipping_address).map((line) => escapeHtml(line)).join('<br />');
  const storeLines = storeContactLines(order).map((line) => escapeHtml(line)).join('<br />');
  const trackingUrl = getTrackingUrl(shipment.provider, shipment.tracking_number);
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Shipping label ${escapeHtml(orderShortId(order))}</title>
  <style>
    @page { size: A6; margin: 8mm; }
    body { font-family: Arial, sans-serif; color: #111827; margin: 0; }
    .label { border: 2px solid #111827; border-radius: 16px; padding: 18px; min-height: 360px; display: flex; flex-direction: column; gap: 14px; }
    .brand { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid #d1d5db; padding-bottom: 12px; }
    .brand h1 { margin: 0; font-size: 18px; }
    .brand p, .block p { margin: 3px 0; font-size: 12px; color: #4b5563; }
    .code { border: 1px dashed #111827; border-radius: 12px; padding: 12px; text-align: center; }
    .code strong { display: block; font-family: monospace; font-size: 20px; letter-spacing: 1px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .block { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; }
    .block h2 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; color: #991b1b; letter-spacing: .08em; }
    .footer { margin-top: auto; font-size: 11px; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <section class="label">
    <div class="brand">
      <div>
        <h1>${escapeHtml(marketplaceName)}</h1>
        <p>Étiquette expédition vendeur</p>
      </div>
      <div>
        <p><strong>Commande:</strong> #${escapeHtml(orderShortId(order))}</p>
        <p><strong>Date:</strong> ${escapeHtml(formatDateTime(new Date().toISOString()))}</p>
      </div>
    </div>
    <div class="code">
      <span>${escapeHtml(shipmentCarrierLabel(shipment.provider))}</span>
      <strong>${escapeHtml(shipment.tracking_number)}</strong>
      ${trackingUrl ? `<p>${escapeHtml(trackingUrl)}</p>` : ''}
    </div>
    <div class="grid">
      <div class="block">
        <h2>Expéditeur</h2>
        <p>${storeLines || 'PandaMarket Seller'}</p>
      </div>
      <div class="block">
        <h2>Destinataire</h2>
        <p>${recipientLines || 'Adresse non disponible'}</p>
      </div>
    </div>
    <div class="footer">Document imprimable. Utilisez “Enregistrer en PDF” depuis la fenêtre d’impression si nécessaire.</div>
  </section>
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
  const preset = CARRIER_OPTIONS.find((option) => {
    const value = option.value.toLowerCase();
    return value === normalizedCarrier || (normalizedCarrier === 'laposte' && value.includes('poste'));
  });
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
  const [paymentGatewayFilter, setPaymentGatewayFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [fulfillmentStatusFilter, setFulfillmentStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [hasDisputeFilter, setHasDisputeFilter] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<Record<OrderColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);
  const [savedPresets, setSavedPresets] = useState<SavedFilterPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);
  const [fulfillOrderTarget, setFulfillOrderTarget] = useState<Order | null>(null);
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [fulfillingId, setFulfillingId] = useState('');
  const [bulkFulfillmentTargets, setBulkFulfillmentTargets] = useState<Order[]>([]);
  const [bulkFulfillmentDrafts, setBulkFulfillmentDrafts] = useState<Record<string, BulkFulfillmentDraft>>({});
  const [bulkFulfilling, setBulkFulfilling] = useState(false);
  const [refundOrderTarget, setRefundOrderTarget] = useState<Order | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReasonCode, setRefundReasonCode] = useState('customer_request');
  const [refundReason, setRefundReason] = useState('');
  const [refundingOrderId, setRefundingOrderId] = useState('');
  const [statusActionId, setStatusActionId] = useState('');
  const [generatingLabelId, setGeneratingLabelId] = useState('');
  const [deliveryProofTarget, setDeliveryProofTarget] = useState<Order | null>(null);
  const [deliveryProofFile, setDeliveryProofFile] = useState<File | null>(null);
  const [deliveryProofReceivedBy, setDeliveryProofReceivedBy] = useState('');
  const [deliveryProofNote, setDeliveryProofNote] = useState('');
  const [submittingDeliveryProofId, setSubmittingDeliveryProofId] = useState('');
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
      if (paymentGatewayFilter) params.set('payment_gateway', paymentGatewayFilter);
      if (paymentStatusFilter) params.set('payment_status', paymentStatusFilter);
      if (fulfillmentStatusFilter) params.set('fulfillment_status', fulfillmentStatusFilter);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (customerFilter.trim()) params.set('customer', customerFilter.trim());
      if (productFilter.trim()) params.set('product', productFilter.trim());
      if (channelFilter) params.set('channel', channelFilter);
      if (countryFilter.trim()) params.set('country', countryFilter.trim().toUpperCase());
      if (hasDisputeFilter) params.set('has_dispute', 'true');
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
  }, [channelFilter, countryFilter, customerFilter, dateFrom, dateTo, fulfillmentStatusFilter, hasDisputeFilter, page, paymentGatewayFilter, paymentStatusFilter, productFilter, search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    try {
      const storedColumns = window.localStorage.getItem(ORDERS_COLUMN_STORAGE_KEY);
      if (storedColumns) {
        setVisibleColumns({ ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(storedColumns) });
      }
      const storedPresets = window.localStorage.getItem(ORDERS_PRESETS_STORAGE_KEY);
      if (storedPresets) {
        const parsed = JSON.parse(storedPresets);
        if (Array.isArray(parsed)) setSavedPresets(parsed);
      }
    } catch {
      setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
      setSavedPresets([]);
    }
  }, []);

  useEffect(() => {
    setSelectedOrderIds((current) => current.filter((id) => orders.some((order) => order.id === id)));
  }, [orders]);

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

  const handlePaymentGatewayChange = (value: string) => {
    setPaymentGatewayFilter(value);
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

  const updateAdvancedFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  const updateHasDisputeFilter = (checked: boolean) => {
    setHasDisputeFilter(checked);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPaymentGatewayFilter('');
    setPaymentStatusFilter('');
    setFulfillmentStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setCustomerFilter('');
    setProductFilter('');
    setChannelFilter('');
    setCountryFilter('');
    setHasDisputeFilter(false);
    setPage(1);
  };

  const currentPresetFilters = (): SavedFilterPreset['filters'] => ({
    search,
    statusFilter,
    paymentGatewayFilter,
    paymentStatusFilter,
    fulfillmentStatusFilter,
    dateFrom,
    dateTo,
    customerFilter,
    productFilter,
    channelFilter,
    countryFilter,
    hasDisputeFilter,
  });

  const saveCurrentPreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const nextPresets = [
      ...savedPresets.filter((preset) => preset.name.toLowerCase() !== name.toLowerCase()),
      { id: `${Date.now()}`, name, filters: currentPresetFilters() },
    ];
    setSavedPresets(nextPresets);
    setPresetName('');
    window.localStorage.setItem(ORDERS_PRESETS_STORAGE_KEY, JSON.stringify(nextPresets));
  };

  const applyPreset = (preset: SavedFilterPreset) => {
    setSearch(preset.filters.search);
    setStatusFilter(preset.filters.statusFilter);
    setPaymentGatewayFilter(preset.filters.paymentGatewayFilter);
    setPaymentStatusFilter(preset.filters.paymentStatusFilter);
    setFulfillmentStatusFilter(preset.filters.fulfillmentStatusFilter);
    setDateFrom(preset.filters.dateFrom);
    setDateTo(preset.filters.dateTo);
    setCustomerFilter(preset.filters.customerFilter);
    setProductFilter(preset.filters.productFilter);
    setChannelFilter(preset.filters.channelFilter);
    setCountryFilter(preset.filters.countryFilter);
    setHasDisputeFilter(preset.filters.hasDisputeFilter);
    setPage(1);
  };

  const deletePreset = (presetId: string) => {
    const nextPresets = savedPresets.filter((preset) => preset.id !== presetId);
    setSavedPresets(nextPresets);
    window.localStorage.setItem(ORDERS_PRESETS_STORAGE_KEY, JSON.stringify(nextPresets));
  };

  const toggleColumn = (columnKey: OrderColumnKey) => {
    const column = ORDER_COLUMNS.find((item) => item.key === columnKey);
    if (column?.required) return;
    setVisibleColumns((current) => {
      const next = { ...current, [columnKey]: !current[columnKey] };
      window.localStorage.setItem(ORDERS_COLUMN_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((current) => current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId]);
  };

  const toggleAllVisibleOrders = () => {
    const visibleIds = orders.map((order) => order.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedOrderIds.includes(id));
    setSelectedOrderIds(allVisibleSelected ? [] : visibleIds);
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

  const generateShippingLabel = async (order: Order) => {
    const existingShipment = latestShipment(order);
    if (existingShipment) {
      const opened = openShipmentLabelDocument(order, existingShipment, marketplaceName);
      if (!opened) setError('Impossible d’ouvrir l’étiquette. Vérifiez le bloqueur de fenêtres.');
      return;
    }

    setGeneratingLabelId(order.id);
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/store/${order.id}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        setError(await getErrorMessage(res, 'Erreur lors de la génération de l’étiquette'));
        return;
      }
      const data = await res.json();
      const shipment = data.shipment as SellerOrderShipment;
      const nextOrder = {
        ...order,
        carrier: shipment.provider,
        tracking_number: shipment.tracking_number,
        shipments: [shipment, ...(order.shipments || []).filter((item) => item.id !== shipment.id)],
      };
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, carrier: shipment.provider, tracking_number: shipment.tracking_number } : item));
      if (selectedOrder?.id === order.id) setSelectedOrder(nextOrder);
      const opened = openShipmentLabelDocument(nextOrder, shipment, marketplaceName);
      if (!opened) setError('Étiquette générée, mais impossible d’ouvrir la fenêtre d’impression.');
      await fetchOrders();
      if (selectedOrder?.id === order.id) await openOrderDetail(nextOrder);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setGeneratingLabelId('');
    }
  };

  const openDeliveryProofModal = (order: Order) => {
    setDeliveryProofTarget(order);
    setDeliveryProofFile(null);
    setDeliveryProofReceivedBy(customerName(order));
    setDeliveryProofNote('');
    setError('');
  };

  const uploadDeliveryProofFile = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      throw new Error('Preuve invalide: utilisez JPG, PNG, WebP ou PDF.');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('La preuve doit faire moins de 10 MB.');
    }

    const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        filename: file.name,
        content_type: file.type,
        file_size: file.size,
        purpose: 'delivery_proof',
      }),
    });
    if (!presignRes.ok) throw new Error(await getErrorMessage(presignRes, 'Upload impossible'));
    const presignData = await presignRes.json();
    if (!presignData.upload_url || !presignData.file_key) throw new Error('URL upload manquante');

    const uploadRes = await fetch(presignData.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!uploadRes.ok) throw new Error('Upload de la preuve impossible');
    return `/api/pd/files/access?key=${encodeURIComponent(presignData.file_key)}`;
  };

  const submitDeliveryProof = async () => {
    if (!deliveryProofTarget) return;
    setSubmittingDeliveryProofId(deliveryProofTarget.id);
    setError('');
    try {
      const proofUrl = deliveryProofFile ? await uploadDeliveryProofFile(deliveryProofFile) : undefined;
      const res = await fetchWithCsrf(`/api/pd/orders/${deliveryProofTarget.id}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          proof_url: proofUrl,
          received_by: deliveryProofReceivedBy.trim() || undefined,
          note: deliveryProofNote.trim() || undefined,
        }),
      });
      if (!res.ok) {
        setError(await getErrorMessage(res, 'Erreur lors du marquage livré'));
        return;
      }
      const deliveredOrder = deliveryProofTarget;
      setDeliveryProofTarget(null);
      setDeliveryProofFile(null);
      setDeliveryProofReceivedBy('');
      setDeliveryProofNote('');
      await refreshOrderAfterStatusChange(deliveredOrder);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setSubmittingDeliveryProofId('');
    }
  };

  const openDeliveryProofFile = async (proofUrl?: string | null) => {
    if (!proofUrl) return;
    try {
      if (proofUrl.startsWith('/api/pd/files/access')) {
        const res = await fetchWithCsrf(proofUrl, { credentials: 'include' });
        if (!res.ok) throw new Error(await getErrorMessage(res, 'Preuve inaccessible'));
        const data = await res.json();
        if (data.download_url) window.open(data.download_url, '_blank', 'noopener,noreferrer');
        return;
      }
      window.open(proofUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preuve inaccessible');
    }
  };

  const markOrderDelivered = async (order: Order) => {
    openDeliveryProofModal(order);
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

  const openRefundModal = (order: Order) => {
    const remaining = refundableRemaining(order);
    setRefundOrderTarget(order);
    setRefundAmount(remaining > 0 ? remaining.toFixed(3) : '');
    setRefundReasonCode('customer_request');
    setRefundReason('');
    setError('');
  };

  const submitRefundRequest = async () => {
    if (!refundOrderTarget) return;
    const amount = toNumber(refundAmount);
    const remaining = refundableRemaining(refundOrderTarget);
    if (amount <= 0 || amount > remaining) {
      setError(`Le montant doit être compris entre 0 et ${formatMoney(remaining, refundOrderTarget.currency || 'TND')}.`);
      return;
    }
    setRefundingOrderId(refundOrderTarget.id);
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/store/${refundOrderTarget.id}/refunds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount,
          reason_code: refundReasonCode,
          reason: refundReason.trim() || undefined,
        }),
      });
      if (!res.ok) {
        setError(await getErrorMessage(res, 'Erreur lors de la demande de remboursement'));
        return;
      }
      setRefundOrderTarget(null);
      setRefundAmount('');
      setRefundReason('');
      await fetchOrders();
      if (selectedOrder?.id === refundOrderTarget.id) {
        await openOrderDetail(refundOrderTarget);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setRefundingOrderId('');
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
      if (paymentGatewayFilter) params.set('payment_gateway', paymentGatewayFilter);
      if (paymentStatusFilter) params.set('payment_status', paymentStatusFilter);
      if (fulfillmentStatusFilter) params.set('fulfillment_status', fulfillmentStatusFilter);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (customerFilter.trim()) params.set('customer', customerFilter.trim());
      if (productFilter.trim()) params.set('product', productFilter.trim());
      if (channelFilter) params.set('channel', channelFilter);
      if (countryFilter.trim()) params.set('country', countryFilter.trim().toUpperCase());
      if (hasDisputeFilter) params.set('has_dispute', 'true');
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

  const selectedOrders = orders.filter((order) => selectedOrderIds.includes(order.id));

  const exportSelectedOrders = () => {
    if (selectedOrders.length === 0) return;
    const columns: CsvColumn[] = [
      { key: 'id', label: 'Order ID' },
      { key: 'created_at', label: 'Date', formatter: (value) => formatDateTime(String(value || '')) },
      { key: 'customer', label: 'Customer' },
      { key: 'customer_email', label: 'Email' },
      { key: 'status', label: 'Order Status', formatter: (value) => statusLabel(String(value || '')) },
      { key: 'payment_gateway', label: 'Payment Method' },
      { key: 'payment_status', label: 'Payment Status', formatter: (value) => paymentStatusLabel(String(value || '')) },
      { key: 'fulfillment_status', label: 'Fulfillment', formatter: (value) => fulfillmentLabel(String(value || '')) },
      { key: 'carrier', label: 'Carrier' },
      { key: 'tracking_number', label: 'Tracking Number' },
      { key: 'store_total', label: 'Store Total' },
      { key: 'currency', label: 'Currency' },
    ];
    exportToCsv(
      selectedOrders.map((order) => ({
        ...order,
        customer: customerName(order),
        store_total: formatMoney(order.store_total ?? order.total, order.currency || 'TND'),
      })) as Record<string, unknown>[],
      `seller-orders-selected-${new Date().toISOString().slice(0, 10)}.csv`,
      columns,
    );
  };

  const printSelectedOrders = (kind: PrintDocumentKind) => {
    if (selectedOrders.length === 0) return;
    selectedOrders.forEach((order) => {
      openOrderPrintDocument(order, kind, marketplaceName);
    });
  };

  const openBulkFulfillment = () => {
    const fulfillableOrders = selectedOrders.filter(canFulfill);
    if (fulfillableOrders.length === 0) {
      setError('Aucune commande sélectionnée ne peut être marquée comme expédiée.');
      return;
    }
    setError('');
    setBulkFulfillmentTargets(fulfillableOrders);
    setBulkFulfillmentDrafts(fulfillableOrders.reduce((acc, order) => {
      acc[order.id] = {
        carrier: order.carrier || '',
        trackingNumber: order.tracking_number || '',
      };
      return acc;
    }, {} as Record<string, BulkFulfillmentDraft>));
  };

  const updateBulkFulfillmentDraft = (orderId: string, field: keyof BulkFulfillmentDraft, value: string) => {
    setBulkFulfillmentDrafts((current) => ({
      ...current,
      [orderId]: {
        carrier: current[orderId]?.carrier || '',
        trackingNumber: current[orderId]?.trackingNumber || '',
        [field]: value,
      },
    }));
  };

  const applyCarrierToBulkFulfillment = (value: string) => {
    setBulkFulfillmentDrafts((current) => {
      const next = { ...current };
      bulkFulfillmentTargets.forEach((order) => {
        next[order.id] = {
          carrier: value,
          trackingNumber: next[order.id]?.trackingNumber || '',
        };
      });
      return next;
    });
  };

  const submitBulkFulfillment = async () => {
    if (bulkFulfillmentTargets.length === 0) return;
    setBulkFulfilling(true);
    setError('');
    try {
      const failed: Order[] = [];
      for (const order of bulkFulfillmentTargets) {
        const draft = bulkFulfillmentDrafts[order.id] || { carrier: '', trackingNumber: '' };
        const res = await fetchWithCsrf(`/api/pd/orders/${order.id}/fulfill`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            carrier: draft.carrier.trim() || undefined,
            tracking_number: draft.trackingNumber.trim() || undefined,
          }),
        });
        if (!res.ok) failed.push(order);
      }
      await fetchOrders();
      if (failed.length > 0) {
        setBulkFulfillmentTargets(failed);
        setSelectedOrderIds(failed.map((order) => order.id));
        setError(`Certaines commandes n’ont pas pu être expédiées: ${failed.map((order) => `#${order.id.slice(-8).toUpperCase()}`).join(', ')}`);
        return;
      }
      setSelectedOrderIds((current) => current.filter((id) => !bulkFulfillmentTargets.some((order) => order.id === id)));
      setBulkFulfillmentTargets([]);
      setBulkFulfillmentDrafts({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setBulkFulfilling(false);
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
  const activeFilterValues = [
    search,
    statusFilter,
    paymentGatewayFilter,
    paymentStatusFilter,
    fulfillmentStatusFilter,
    dateFrom,
    dateTo,
    customerFilter,
    productFilter,
    channelFilter,
    countryFilter,
    hasDisputeFilter ? 'has_dispute' : '',
  ];
  const hasActiveFilters = activeFilterValues.some(Boolean);
  const activeFilterCount = activeFilterValues.filter(Boolean).length;

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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        {[
          { label: 'Revenu 30j', value: formatMoney(summary?.revenue_30d ?? 0), icon: TrendingUp, gradient: 'from-amber-500 to-teal-600' },
          { label: 'Revenu 7j', value: formatMoney(summary?.revenue_7d ?? 0), icon: TrendingUp, gradient: 'from-emerald-500 to-teal-600' },
          { label: "Aujourd'hui", value: formatMoney(summary?.revenue_today ?? 0), icon: CalendarDays, gradient: 'from-blue-500 to-indigo-600' },
          { label: 'À expédier', value: String(summary?.to_ship ?? 0), icon: PackageCheck, gradient: 'from-amber-500 to-orange-600' },
          { label: 'AOV', value: formatMoney(summary?.average_order_value ?? 0), icon: CreditCard, gradient: 'from-violet-500 to-purple-600' },
          { label: 'Remboursements', value: formatPercent(summary?.refund_rate ?? 0), icon: Ban, gradient: 'from-red-500 to-rose-700' },
          { label: 'SLA 48h', value: formatPercent(summary?.fulfillment_sla_rate ?? 0), detail: `Moy. ${formatHours(summary?.average_fulfillment_hours ?? 0)}`, icon: CheckCircle2, gradient: 'from-slate-500 to-slate-700' },
        ].map((item) => (
          <div key={item.label} className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-400">{item.label}</span>
              <div className={`rounded-xl bg-gradient-to-br ${item.gradient} p-2.5 text-white shadow-lg`}>
                <item.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black text-gray-900">{item.value}</p>
            {'detail' in item && item.detail && <p className="mt-1 text-xs font-black text-gray-400">{item.detail}</p>}
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
                value={paymentGatewayFilter}
                onChange={(event) => handlePaymentGatewayChange(event.target.value)}
                className="min-w-[160px] flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-600 outline-none transition-colors hover:bg-gray-50 lg:flex-none"
              >
                <option value="">Tous moyens</option>
                <option value="flouci">Flouci</option>
                <option value="konnect">Konnect</option>
                <option value="manual_mandat">Mandat</option>
                <option value="cod">COD</option>
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
              <button
                type="button"
                onClick={() => setShowAdvancedFilters((value) => !value)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-600 hover:border-[#B91C1C] hover:text-[#B91C1C]"
              >
                <Filter className="h-4 w-4" />
                Avancé
              </button>
            </div>
          </div>
          {showAdvancedFilters && (
            <div className="grid gap-3 rounded-2xl border border-gray-100 bg-white p-4 md:grid-cols-2 xl:grid-cols-5">
              <input
                value={customerFilter}
                onChange={(event) => updateAdvancedFilter(setCustomerFilter, event.target.value)}
                placeholder="Client, email, téléphone..."
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold outline-none focus:border-[#B91C1C]"
              />
              <input
                value={productFilter}
                onChange={(event) => updateAdvancedFilter(setProductFilter, event.target.value)}
                placeholder="Produit, SKU, slug..."
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold outline-none focus:border-[#B91C1C]"
              />
              <select
                value={channelFilter}
                onChange={(event) => updateAdvancedFilter(setChannelFilter, event.target.value)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 outline-none focus:border-[#B91C1C]"
              >
                <option value="">Tous canaux</option>
                <option value="marketplace">Marketplace</option>
                <option value="storefront">Storefront</option>
              </select>
              <input
                value={countryFilter}
                onChange={(event) => updateAdvancedFilter(setCountryFilter, event.target.value.toUpperCase().slice(0, 2))}
                placeholder="Pays (TN)"
                maxLength={2}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold uppercase outline-none focus:border-[#B91C1C]"
              />
              <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-black text-gray-600">
                <input
                  type="checkbox"
                  checked={hasDisputeFilter}
                  onChange={(event) => updateHasDisputeFilter(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#B91C1C]"
                />
                Has dispute
              </label>
            </div>
          )}
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <input
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                placeholder="Nom du preset"
                className="min-w-[180px] rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold outline-none focus:border-[#B91C1C]"
              />
              <button
                type="button"
                onClick={saveCurrentPreset}
                disabled={!presetName.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-3 py-2 text-sm font-black text-white disabled:opacity-40"
              >
                <Save className="h-4 w-4" />
                Sauver preset
              </button>
              {savedPresets.map((preset) => (
                <span key={preset.id} className="inline-flex overflow-hidden rounded-full border border-gray-200 bg-gray-50 text-xs font-black">
                  <button type="button" onClick={() => applyPreset(preset)} className="px-3 py-1.5 text-gray-700 hover:bg-white">
                    {preset.name}
                  </button>
                  <button type="button" onClick={() => deletePreset(preset.id)} className="border-l border-gray-200 px-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wide text-gray-400">Colonnes</span>
              {ORDER_COLUMNS.map((column) => (
                <label key={column.key} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-black text-gray-600">
                  <input
                    type="checkbox"
                    checked={visibleColumns[column.key]}
                    disabled={column.required}
                    onChange={() => toggleColumn(column.key)}
                    className="h-3.5 w-3.5"
                  />
                  {column.label}
                </label>
              ))}
            </div>
          </div>
          {selectedOrderIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <span className="mr-2 text-sm font-black text-amber-900">{selectedOrderIds.length} sélectionnée{selectedOrderIds.length > 1 ? 's' : ''}</span>
              <button type="button" onClick={() => printSelectedOrders('delivery_slip')} className="rounded-full bg-white px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100">Print labels</button>
              <button type="button" onClick={() => printSelectedOrders('invoice')} className="rounded-full bg-white px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100">Print invoices</button>
              <button type="button" onClick={openBulkFulfillment} className="rounded-full bg-[#B91C1C] px-3 py-2 text-xs font-black text-white hover:bg-[#991B1B]">Mark shipped</button>
              <button type="button" onClick={exportSelectedOrders} className="rounded-full bg-white px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100">Export selected</button>
              <button type="button" onClick={() => setSelectedOrderIds([])} className="rounded-full px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100">Clear</button>
            </div>
          )}
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
                  <th className="px-4 py-3.5 font-bold">
                    <input
                      type="checkbox"
                      checked={orders.length > 0 && orders.every((order) => selectedOrderIds.includes(order.id))}
                      onChange={toggleAllVisibleOrders}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </th>
                  {visibleColumns.id && <th className="px-6 py-3.5 font-bold">ID Commande</th>}
                  {visibleColumns.date && <th className="px-6 py-3.5 font-bold">Date</th>}
                  {visibleColumns.customer && <th className="px-6 py-3.5 font-bold">Client</th>}
                  {visibleColumns.payment && <th className="px-6 py-3.5 font-bold">Paiement</th>}
                  {visibleColumns.total && <th className="px-6 py-3.5 font-bold">Total</th>}
                  {visibleColumns.status && <th className="px-6 py-3.5 font-bold">Statut</th>}
                  {visibleColumns.fulfillment && <th className="px-6 py-3.5 font-bold">Fulfillment</th>}
                  {visibleColumns.actions && <th className="px-6 py-3.5 font-bold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => {
                  const openReportCount = toNumber(order.open_report_count);
                  return (
                    <tr key={order.id} className="hover:bg-[#B91C1C]/[0.02] transition-colors group border-b border-gray-50 last:border-0">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </td>
                      {visibleColumns.id && (
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex w-fit items-center rounded-lg bg-gray-50 px-2.5 py-1 font-mono text-xs font-bold text-gray-700 group-hover:bg-[#B91C1C]/10 group-hover:text-[#B91C1C] transition-colors">
                              #{order.id.slice(-8).toUpperCase()}
                            </span>
                            {openReportCount > 0 && (
                              <span className="inline-flex w-fit rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-black text-red-600">
                                {openReportCount} dispute{openReportCount > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleColumns.date && (
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleDateString('fr-TN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                      )}
                      {visibleColumns.customer && (
                        <td className="px-6 py-4 text-sm">
                          <p className="font-semibold text-gray-900">{customerName(order)}</p>
                          {order.customer_email && <p className="text-xs text-gray-500">{order.customer_email}</p>}
                        </td>
                      )}
                      {visibleColumns.payment && (
                        <td className="px-6 py-4 text-sm">
                          <p className="font-semibold capitalize text-gray-700">
                            {order.payment_gateway?.replace('_', ' ') || '—'}
                          </p>
                          <span className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${paymentStatusColor(order.payment_status)}`}>
                            {paymentStatusLabel(order.payment_status)}
                          </span>
                        </td>
                      )}
                      {visibleColumns.total && (
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          <span className="font-black">{formatMoney(order.store_total ?? order.total, order.currency || 'TND')}</span>
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                            {statusLabel(order.status)}
                          </span>
                        </td>
                      )}
                      {visibleColumns.fulfillment && (
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
                      )}
                      {visibleColumns.actions && (
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
                              onClick={() => void generateShippingLabel(order)}
                              disabled={generatingLabelId === order.id || !canGenerateShippingLabel(order)}
                              className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-40"
                              title="Étiquette transporteur"
                            >
                              {generatingLabelId === order.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <ReceiptText className="w-4 h-4" />
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
                              disabled={submittingDeliveryProofId === order.id || !canMarkDelivered(order)}
                              className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-40"
                              title="Marquer livré"
                            >
                              {submittingDeliveryProofId === order.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
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
                          <div className="mt-4 grid grid-cols-3 gap-2">
                            <div className="rounded-xl bg-gray-50 p-3">
                              <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">Commandes</p>
                              <p className="mt-1 text-sm font-black text-gray-900">{toNumber(selectedOrder.customer_order_count)}</p>
                            </div>
                            <div className="rounded-xl bg-gray-50 p-3">
                              <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">LTV</p>
                              <p className="mt-1 text-sm font-black text-gray-900">{formatMoney(selectedOrder.customer_lifetime_value ?? 0, selectedOrder.currency || 'TND')}</p>
                            </div>
                            <div className="rounded-xl bg-gray-50 p-3">
                              <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">Dernière</p>
                              <p className="mt-1 text-xs font-black text-gray-900">{formatDateTime(selectedOrder.customer_last_order_at)}</p>
                            </div>
                          </div>
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
                        <ReceiptText className="h-4 w-4 text-[#B91C1C]" />
                        <h3 className="text-sm font-black text-gray-900">Remboursements</h3>
                      </div>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Déjà demandé/traité</span>
                          <span className="font-bold text-gray-900">{formatMoney(refundRequestedTotal(selectedOrder), selectedOrder.currency || 'TND')}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Reste remboursable</span>
                          <span className="font-black text-gray-900">{formatMoney(refundableRemaining(selectedOrder), selectedOrder.currency || 'TND')}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openRefundModal(selectedOrder)}
                        disabled={!canRequestRefund(selectedOrder)}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CreditCard className="h-4 w-4" />
                        Demander un remboursement
                      </button>
                      {(selectedOrder.refunds || []).length > 0 && (
                        <div className="mt-4 space-y-2">
                          {selectedOrder.refunds?.map((refund) => (
                            <div key={refund.id} className="rounded-2xl bg-white p-3 text-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-black text-gray-900">{formatMoney(refund.amount, refund.currency || selectedOrder.currency || 'TND')}</p>
                                  <p className="mt-1 text-xs font-semibold text-gray-500">{refundReasonLabel(refund.reason_code)} · {formatDateTime(refund.created_at)}</p>
                                </div>
                                <span className={`rounded-full border px-2 py-0.5 text-xs font-black ${refundStatusColor(refund.status)}`}>
                                  {refundStatusLabel(refund.status)}
                                </span>
                              </div>
                              {refund.reason && <p className="mt-2 text-xs font-semibold text-gray-500">{refund.reason}</p>}
                            </div>
                          ))}
                        </div>
                      )}
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
                      {(selectedOrder.shipments || []).length > 0 && (
                        <div className="mt-4 space-y-2">
                          {selectedOrder.shipments?.map((shipment) => (
                            <div key={shipment.id} className="rounded-2xl bg-white p-3 text-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-black text-gray-900">{shipmentCarrierLabel(shipment.provider)}</p>
                                  <p className="mt-1 font-mono text-xs font-bold text-gray-500">{shipment.tracking_number}</p>
                                  {shipment.estimated_delivery && <p className="mt-1 text-xs font-semibold text-gray-500">ETA {formatDateTime(shipment.estimated_delivery)}</p>}
                                </div>
                                <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-black text-purple-700">{shipment.status}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const opened = openShipmentLabelDocument(selectedOrder, shipment, marketplaceName);
                                  if (!opened) setError('Impossible d’ouvrir l’étiquette.');
                                }}
                                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100"
                              >
                                <ReceiptText className="h-3.5 w-3.5" />
                                {shipment.label_url ? 'Ouvrir PDF transporteur' : 'Imprimer étiquette'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {(selectedOrder.delivery_proofs || []).length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs font-black uppercase tracking-wide text-gray-400">Preuves de livraison</p>
                          {selectedOrder.delivery_proofs?.map((proof) => (
                            <div key={proof.id} className="rounded-2xl bg-white p-3 text-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-black text-gray-900">{proof.received_by || 'Réception confirmée'}</p>
                                  <p className="mt-1 text-xs font-semibold text-gray-500">{formatDateTime(proof.created_at)}</p>
                                </div>
                                {proof.proof_url && (
                                  <button
                                    type="button"
                                    onClick={() => void openDeliveryProofFile(proof.proof_url)}
                                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-black text-gray-700 hover:bg-gray-200"
                                  >
                                    Voir
                                    <ExternalLink className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                              {proof.note && <p className="mt-2 text-xs font-semibold text-gray-500">{proof.note}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-4 space-y-2">
                        {canGenerateShippingLabel(selectedOrder) && (
                          <button
                            type="button"
                            onClick={() => void generateShippingLabel(selectedOrder)}
                            disabled={generatingLabelId === selectedOrder.id}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-black text-amber-700 transition hover:bg-amber-50 disabled:opacity-60"
                          >
                            {generatingLabelId === selectedOrder.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ReceiptText className="h-4 w-4" />}
                            {latestShipment(selectedOrder) ? 'Ouvrir étiquette' : 'Générer étiquette'}
                          </button>
                        )}
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
                            disabled={submittingDeliveryProofId === selectedOrder.id}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 py-3 text-sm font-black text-white transition hover:bg-amber-700 disabled:opacity-60"
                          >
                            {submittingDeliveryProofId === selectedOrder.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
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

      {refundOrderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900">Demande de remboursement</h2>
                <p className="mt-1 inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-xs font-bold text-gray-600">#{refundOrderTarget.id.slice(-8).toUpperCase()}</p>
              </div>
              <button
                type="button"
                onClick={() => setRefundOrderTarget(null)}
                disabled={refundingOrderId === refundOrderTarget.id}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-red-700">Total boutique</p>
                  <p className="mt-1 font-black text-red-950">{formatMoney(refundOrderTarget.store_total ?? refundOrderTarget.total, refundOrderTarget.currency || 'TND')}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-red-700">Reste remboursable</p>
                  <p className="mt-1 font-black text-red-950">{formatMoney(refundableRemaining(refundOrderTarget), refundOrderTarget.currency || 'TND')}</p>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Montant</label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  max={refundableRemaining(refundOrderTarget)}
                  value={refundAmount}
                  onChange={(event) => setRefundAmount(event.target.value)}
                  disabled={refundingOrderId === refundOrderTarget.id}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-[#B91C1C] focus:bg-white focus:ring-4 focus:ring-[#B91C1C]/10 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Motif</label>
                <select
                  value={refundReasonCode}
                  onChange={(event) => setRefundReasonCode(event.target.value)}
                  disabled={refundingOrderId === refundOrderTarget.id}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-[#B91C1C] focus:bg-white focus:ring-4 focus:ring-[#B91C1C]/10 disabled:opacity-50"
                >
                  {REFUND_REASON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Note interne</label>
                <textarea
                  value={refundReason}
                  onChange={(event) => setRefundReason(event.target.value)}
                  disabled={refundingOrderId === refundOrderTarget.id}
                  rows={4}
                  maxLength={1000}
                  placeholder="Expliquez le contexte du remboursement..."
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-[#B91C1C] focus:bg-white focus:ring-4 focus:ring-[#B91C1C]/10 disabled:opacity-50"
                />
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                Cette action crée une demande/trace de remboursement côté vendeur. Le traitement passerelle réel reste à confirmer via le workflow paiement/admin.
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setRefundOrderTarget(null)}
                  disabled={refundingOrderId === refundOrderTarget.id}
                  className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-black text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void submitRefundRequest()}
                  disabled={refundingOrderId === refundOrderTarget.id}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  {refundingOrderId === refundOrderTarget.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  Enregistrer la demande
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deliveryProofTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900">Preuve de livraison</h2>
                <p className="mt-1 inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-xs font-bold text-gray-600">#{deliveryProofTarget.id.slice(-8).toUpperCase()}</p>
              </div>
              <button
                type="button"
                onClick={() => setDeliveryProofTarget(null)}
                disabled={submittingDeliveryProofId === deliveryProofTarget.id}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                Ajoutez une photo/PDF de remise si disponible, puis confirmez la livraison. La preuve est stockée en accès privé vendeur.
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Reçu par</label>
                <input
                  value={deliveryProofReceivedBy}
                  onChange={(event) => setDeliveryProofReceivedBy(event.target.value)}
                  disabled={submittingDeliveryProofId === deliveryProofTarget.id}
                  placeholder="Nom du destinataire ou réceptionnaire"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-[#B91C1C] focus:bg-white focus:ring-4 focus:ring-[#B91C1C]/10 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Fichier preuve</label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm font-black text-gray-600 hover:border-[#B91C1C] hover:bg-red-50/40">
                  <Upload className="h-4 w-4" />
                  {deliveryProofFile ? deliveryProofFile.name : 'Choisir une image ou PDF'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(event) => setDeliveryProofFile(event.target.files?.[0] || null)}
                    disabled={submittingDeliveryProofId === deliveryProofTarget.id}
                    className="hidden"
                  />
                </label>
                <p className="mt-1 text-xs font-semibold text-gray-400">Optionnel · JPG, PNG, WebP ou PDF · max 10 MB</p>
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Note livraison</label>
                <textarea
                  value={deliveryProofNote}
                  onChange={(event) => setDeliveryProofNote(event.target.value)}
                  disabled={submittingDeliveryProofId === deliveryProofTarget.id}
                  rows={4}
                  maxLength={1000}
                  placeholder="Ex: remis au gardien, client absent mais colis déposé selon accord..."
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-[#B91C1C] focus:bg-white focus:ring-4 focus:ring-[#B91C1C]/10 disabled:opacity-50"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setDeliveryProofTarget(null)}
                  disabled={submittingDeliveryProofId === deliveryProofTarget.id}
                  className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-black text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void submitDeliveryProof()}
                  disabled={submittingDeliveryProofId === deliveryProofTarget.id}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black text-white transition hover:bg-amber-700 disabled:opacity-60"
                >
                  {submittingDeliveryProofId === deliveryProofTarget.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Confirmer livraison
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {bulkFulfillmentTargets.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 bg-gray-50/70 p-6">
              <div>
                <h2 className="text-lg font-black text-gray-900">Expédition groupée</h2>
                <p className="mt-1 text-sm font-semibold text-gray-500">
                  {bulkFulfillmentTargets.length} commande{bulkFulfillmentTargets.length > 1 ? 's' : ''} prête{bulkFulfillmentTargets.length > 1 ? 's' : ''} à expédier.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBulkFulfillmentTargets([]);
                  setBulkFulfillmentDrafts({});
                }}
                disabled={bulkFulfilling}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[calc(90vh-180px)] overflow-y-auto p-6">
              <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-amber-700">Appliquer un transporteur à toutes les commandes</label>
                <select
                  onChange={(event) => applyCarrierToBulkFulfillment(event.target.value)}
                  defaultValue=""
                  disabled={bulkFulfilling}
                  className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-200/40 disabled:opacity-50"
                >
                  <option value="">Sélectionner</option>
                  {CARRIER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                  <option value="Autre">Autre / manuel</option>
                </select>
              </div>
              <div className="space-y-3">
                {bulkFulfillmentTargets.map((order) => {
                  const draft = bulkFulfillmentDrafts[order.id] || { carrier: '', trackingNumber: '' };
                  return (
                    <div key={order.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-mono text-xs font-black text-gray-500">#{order.id.slice(-8).toUpperCase()}</p>
                          <p className="mt-1 text-sm font-black text-gray-900">{customerName(order)}</p>
                        </div>
                        <span className="text-sm font-black text-gray-900">{formatMoney(order.store_total ?? order.total, order.currency || 'TND')}</span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-400">Transporteur</label>
                          <select
                            value={draft.carrier}
                            onChange={(event) => updateBulkFulfillmentDraft(order.id, 'carrier', event.target.value)}
                            disabled={bulkFulfilling}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-[#B91C1C] disabled:opacity-50"
                          >
                            <option value="">Sélectionner</option>
                            {CARRIER_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                            <option value="Autre">Autre / manuel</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-400">Numéro de suivi</label>
                          <input
                            value={draft.trackingNumber}
                            onChange={(event) => updateBulkFulfillmentDraft(order.id, 'trackingNumber', event.target.value)}
                            disabled={bulkFulfilling}
                            placeholder="Tracking number"
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-[#B91C1C] disabled:opacity-50"
                          />
                          {getTrackingUrl(draft.carrier, draft.trackingNumber) && (
                            <a
                              href={getTrackingUrl(draft.carrier, draft.trackingNumber)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1.5 inline-flex items-center gap-1 text-xs font-black text-amber-700 hover:text-amber-800"
                            >
                              Prévisualiser
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/70 p-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setBulkFulfillmentTargets([]);
                  setBulkFulfillmentDrafts({});
                }}
                disabled={bulkFulfilling}
                className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void submitBulkFulfillment()}
                disabled={bulkFulfilling}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-5 py-3 text-sm font-black text-white transition hover:bg-[#991B1B] disabled:opacity-60"
              >
                {bulkFulfilling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                Confirmer {bulkFulfillmentTargets.length} expédition{bulkFulfillmentTargets.length > 1 ? 's' : ''}
              </button>
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
