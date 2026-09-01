'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import { fetchWithCsrf } from '@/lib/api';
import { exportToCsv, type CsvColumn } from '@/lib/csv-export';
import { useLocale } from '@/contexts/LocaleContext';
import { useCallback, useEffect, useState } from 'react';
import { Search, Filter, Eye, Truck, Loader2, MessageSquare, X, CalendarDays, CreditCard, PackageCheck, RefreshCw, TrendingUp, CheckCircle2, Clock3, Ban, ReceiptText, Package, Mail, Phone, MapPin, Printer, StickyNote, Save, Download, ExternalLink, Upload, ShieldAlert, PhoneCall, Check, RotateCcw, DollarSign } from 'lucide-react';
import { SellerOrderDrawer } from '@/components/dashboard/orders/SellerOrderDrawer';

export type OrdersMainTab = 'all_orders' | 'cod_radar' | 'rto_returns' | 'courier_settlements';

export interface CodVerification {
  id: string;
  order_id: string;
  store_id: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'unreachable' | 'otp_verified';
  call_attempts: number;
  last_call_at: string | null;
  otp_sent_at?: string | null;
  otp_verified_at?: string | null;
  risk_score: number;
  risk_factors: Array<{ name: string; impact: 'positive' | 'negative' | 'neutral'; description: string }>;
  notes: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
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
  bundle_items?: Array<{
    product_id?: string;
    product_title?: string;
    variant_title?: string | null;
    quantity?: number;
  }>;
}

export interface SellerOrderNote {
  id: string;
  order_id: string;
  store_id: string;
  body: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourierSettlement {
  id: string;
  store_id: string;
  order_id: string;
  carrier: string;
  tracking_number: string | null;
  collected_amount: string | number;
  courier_fee: string | number;
  net_payout: string | number;
  status: 'pending' | 'settled' | 'disputed';
  settled_at: string | null;
  settlement_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_phone?: string;
  delivery_date?: string | null;
}

export interface Order {
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
  other_pending_stores?: string | number | null;
  customer_order_count?: string | number | null;
  customer_lifetime_value?: string | number | null;
  customer_last_order_at?: string | null;
  items?: OrderItem[];
  seller_note?: SellerOrderNote | null;
  refunds?: SellerOrderRefund[];
  shipments?: SellerOrderShipment[];
  delivery_proofs?: SellerDeliveryProof[];
  rto_reason_code?: string | null;
  rto_notes?: string | null;
  rto_at?: string | null;
  cod_status?: string | null;
  cod_risk_score?: number | null;
  cod_verification?: CodVerification | null;
  courier_settlement?: CourierSettlement | null;
}

export interface ShippingAddress {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export interface SellerOrderRefund {
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

export interface SellerOrderShipment {
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

export interface SellerDeliveryProof {
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

const ORDER_COLUMNS: { key: OrderColumnKey; labelKey: string; required?: boolean }[] = [
  { key: 'id', labelKey: 'dashboardPages.orders.orderNumber', required: true },
  { key: 'date', labelKey: 'dashboardPages.orders.date' },
  { key: 'customer', labelKey: 'dashboardPages.orders.customer' },
  { key: 'payment', labelKey: 'dashboardPages.orders.paymentStatus' },
  { key: 'total', labelKey: 'dashboardPages.orders.total' },
  { key: 'status', labelKey: 'dashboardPages.orders.status' },
  { key: 'fulfillment', labelKey: 'dashboardPages.orders.fulfillment' },
  { key: 'actions', labelKey: 'dashboardPages.orders.actions', required: true },
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
  { value: 'customer_request', labelKey: 'dashboardPages.orders.refundReasonCustomerRequest' },
  { value: 'out_of_stock', labelKey: 'dashboardPages.orders.refundReasonOutOfStock' },
  { value: 'damaged_item', labelKey: 'dashboardPages.orders.refundReasonDamagedItem' },
  { value: 'late_delivery', labelKey: 'dashboardPages.orders.refundReasonLateDelivery' },
  { value: 'duplicate_order', labelKey: 'dashboardPages.orders.refundReasonDuplicateOrder' },
  { value: 'goodwill', labelKey: 'dashboardPages.orders.refundReasonGoodwill' },
  { value: 'other', labelKey: 'dashboardPages.orders.refundReasonOther' },
];

const statusLabel = (status: string, t: (key: string) => string) => {
  const labels: Record<string, string> = {
    pending: t('dashboardPages.orders.pending'),
    payment_required: t('dashboardPages.orders.paymentRequired'),
    processing: t('dashboardPages.orders.confirmed'),
    fulfilled: t('dashboardPages.orders.shipped'),
    delivered: t('dashboardPages.orders.delivered'),
    cancelled: t('dashboardPages.orders.cancelled'),
  };
  return labels[status] || status;
};

const paymentStatusLabel = (status: string, t: (key: string) => string) => {
  const labels: Record<string, string> = {
    pending: t('dashboardPages.orders.pending'),
    captured: t('dashboardPages.orders.paid'),
    failed: t('dashboardPages.orders.failed'),
    refunded: t('dashboardPages.orders.refunded'),
  };
  return labels[status] || status || '—';
};

const paymentStatusColor = (status: string) => {
  switch (status) {
    case 'captured': return 'bg-emerald-50 text-emerald-800 border-emerald-200/60';
    case 'failed': return 'bg-rose-50 text-rose-800 border-rose-200/60';
    case 'refunded': return 'bg-zinc-100 text-zinc-600 border-zinc-200/80';
    default: return 'bg-amber-50 text-amber-800 border-amber-200/60';
  }
};

const refundReasonLabel = (reasonCode: string, t: (key: string) => string) => (
  REFUND_REASON_OPTIONS.find((option) => option.value === reasonCode)?.labelKey
    ? t(REFUND_REASON_OPTIONS.find((option) => option.value === reasonCode)!.labelKey)
    : reasonCode
);

const refundStatusColor = (status: string) => {
  switch (status) {
    case 'processed': return 'bg-emerald-50 text-emerald-800 border-emerald-200/60';
    case 'approved': return 'bg-sky-50 text-sky-800 border-sky-200/60';
    case 'rejected': return 'bg-rose-50 text-rose-800 border-rose-200/60';
    default: return 'bg-amber-50 text-amber-800 border-amber-200/60';
  }
};

const refundStatusLabel = (status: string, t: (key: string) => string) => {
  const labels: Record<string, string> = {
    requested: t('dashboardPages.orders.refundRequested'),
    approved: t('dashboardPages.orders.refundApproved'),
    processed: t('dashboardPages.orders.refundProcessed'),
    rejected: t('dashboardPages.orders.refundRejected'),
  };
  return labels[status] || status;
};

async function getErrorMessage(res: Response, fallback = '') {
  try {
    const data = await res.json();
    return data.error?.message || data.message || (fallback ? `${fallback} (${res.status})` : `(${res.status})`);
  } catch {
    return fallback ? `${fallback} (${res.status})` : `(${res.status})`;
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

function formatHours(value: unknown, t: (key: string, params?: Record<string, string | number>) => string) {
  const hours = toNumber(value);
  if (hours <= 0) return '—';
  if (hours < 24) return t('dashboardPages.orders.formatHours', { count: hours.toFixed(1) });
  return t('dashboardPages.orders.formatDays', { count: (hours / 24).toFixed(1) });
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

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString(locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN', {
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

function formatAddressLines(address: ShippingAddress | null | undefined, t: (key: string, params?: Record<string, string | number>) => string) {
  if (!address) return [];
  return [
    [address.first_name, address.last_name].filter(Boolean).join(' ').trim(),
    address.address_line_1,
    address.address_line_2,
    [address.postal_code, address.city].filter(Boolean).join(' ').trim(),
    address.country || 'TN',
    address.phone ? t('dashboardPages.orders.phoneLabel', { phone: address.phone }) : '',
  ].filter((line): line is string => typeof line === 'string' && line.trim().length > 0);
}

function customerName(order: Order, t: (key: string) => string) {
  const name = [order.customer_first_name, order.customer_last_name].filter(Boolean).join(' ').trim();
  return name || order.customer_email || order.customer_id || order.storefront_customer_id || t('dashboardPages.orders.customer');
}

function orderShortId(order: Order) {
  return order.id.slice(-8).toUpperCase();
}

function stringSetting(settings: Record<string, unknown> | null | undefined, key: string) {
  const value = settings?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function storeDisplayName(order: Order, t: (key: string) => string) {
  return stringSetting(order.store_settings, 'store_name') || order.store_name || t('dashboardPages.orders.defaultSellerName');
}

function storeContactLines(order: Order, t: (key: string) => string) {
  const settings = order.store_settings;
  return [
    storeDisplayName(order, t),
    stringSetting(settings, 'address'),
    [stringSetting(settings, 'city'), stringSetting(settings, 'country')].filter(Boolean).join(', '),
    stringSetting(settings, 'phone'),
    stringSetting(settings, 'email'),
    order.store_custom_domain || (order.store_subdomain ? `${order.store_subdomain}.garbage.team` : ''),
  ].filter((line): line is string => typeof line === 'string' && line.trim().length > 0);
}

function openOrderPrintDocument(order: Order, kind: PrintDocumentKind, marketplaceName: string, t: (key: string, params?: Record<string, string | number>) => string, locale: string) {
  if (typeof window === 'undefined') return false;
  const printWindow = window.open('', '_blank', 'width=1024,height=768');
  if (!printWindow) return false;

  const isInvoice = kind === 'invoice';
  const currency = order.currency || 'TND';
  const shortId = orderShortId(order);
  const docCode = isInvoice ? `INV-${shortId}` : `DEL-${shortId}`;
  const docTitle = isInvoice ? t('dashboardPages.orders.invoice') : t('dashboardPages.orders.deliverySlip');
  const docSubtitle = isInvoice
    ? t('dashboardPages.orders.invoiceSubtitle')
    : t('dashboardPages.orders.deliverySlipSubtitle');
  const storeLines = storeContactLines(order, t).map((line) => escapeHtml(line)).join('<br />');
  const shippingAddressLines = formatAddressLines(order.shipping_address, t);
  const shippingAddress = shippingAddressLines.length > 0
    ? shippingAddressLines.map((line) => escapeHtml(line)).join('<br />')
    : t('dashboardPages.orders.noAddressRequired');
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
              <strong>${escapeHtml(item.product_title || t('dashboardPages.orders.product'))}</strong>
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
            <strong>${escapeHtml(item.product_title || t('dashboardPages.orders.product'))}</strong>
            ${details ? `<small>${escapeHtml(details)}</small>` : ''}
          </td>
          <td class="center">${escapeHtml(toNumber(item.quantity))}</td>
          <td class="center"><span class="checkbox"></span></td>
        </tr>
      `;
    }).join('')
    : `<tr><td colspan="${isInvoice ? 5 : 4}" class="empty">${escapeHtml(t('dashboardPages.orders.itemsDetailUnavailable'))}</td></tr>`;

  const tableHeader = isInvoice
    ? `
        <tr>
          <th class="center">#</th>
          <th>${escapeHtml(t('dashboardPages.orders.item'))}</th>
          <th class="center">${escapeHtml(t('dashboardPages.orders.quantity'))}</th>
          <th class="right">${escapeHtml(t('dashboardPages.orders.unitPrice'))}</th>
          <th class="right">${escapeHtml(t('dashboardPages.orders.total'))}</th>
        </tr>
      `
    : `
        <tr>
          <th class="center">#</th>
          <th>${escapeHtml(t('dashboardPages.orders.itemToPrepare'))}</th>
          <th class="center">${escapeHtml(t('dashboardPages.orders.quantity'))}</th>
          <th class="center">${escapeHtml(t('dashboardPages.orders.control'))}</th>
        </tr>
      `;

  const totalsSection = isInvoice
    ? `
      <section class="totals">
        <div class="totals-box">
          <div class="total-row"><span>${escapeHtml(t('dashboardPages.orders.storeSubtotal'))}</span><span>${escapeHtml(formatMoney(order.store_subtotal ?? order.subtotal, currency))}</span></div>
          <div class="total-row"><span>${escapeHtml(t('dashboardPages.orders.storeShipping'))}</span><span>${escapeHtml(formatMoney(order.store_shipping_total ?? order.shipping_total, currency))}</span></div>
          <div class="total-row final"><span>${escapeHtml(t('dashboardPages.orders.storeTotal'))}</span><span>${escapeHtml(formatMoney(order.store_total ?? order.total, currency))}</span></div>
        </div>
      </section>
    `
    : `
      <section class="delivery-checklist">
        <div><span class="checkbox"></span> ${escapeHtml(t('dashboardPages.orders.itemsChecked'))}</div>
        <div><span class="checkbox"></span> ${escapeHtml(t('dashboardPages.orders.addressConfirmed'))}</div>
        <div><span class="checkbox"></span> ${escapeHtml(t('dashboardPages.orders.packagePacked'))}</div>
        <div><span class="checkbox"></span> ${escapeHtml(t('dashboardPages.orders.trackingFilled'))}</div>
      </section>
      <section class="signature-grid">
        <div><span>${escapeHtml(t('dashboardPages.orders.preparedBy'))}</span></div>
        <div><span>${escapeHtml(t('dashboardPages.orders.carrier'))}</span></div>
        <div><span>${escapeHtml(t('dashboardPages.orders.customerReception'))}</span></div>
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
    <button type="button" onclick="window.print()">${escapeHtml(t('dashboardPages.orders.print'))} ${escapeHtml(docTitle.toLowerCase())}</button>
  </div>
  <main class="sheet">
    <section class="header">
      <div>
        <div class="brand"><span class="brand-mark">${escapeHtml(marketplaceName.charAt(0).toUpperCase() || 'P')}</span>${escapeHtml(marketplaceName)}</div>
        <h1>${escapeHtml(docTitle)}</h1>
        <span class="doc-pill">${isInvoice ? escapeHtml(t('dashboardPages.orders.documentWithAmounts')) : escapeHtml(t('dashboardPages.orders.packageWithoutPrice'))}</span>
        <p class="muted">${escapeHtml(docSubtitle)}</p>
        <div class="store-block">${storeLines || escapeHtml(storeDisplayName(order, t))}</div>
      </div>
      <div class="document-meta">
        <p class="code">${escapeHtml(docCode)}</p>
        <div class="meta-row"><span>${escapeHtml(t('dashboardPages.orders.document'))}</span><span>${escapeHtml(docTitle)}</span></div>
        <div class="meta-row"><span>${escapeHtml(t('dashboardPages.orders.order'))}</span><span>#${escapeHtml(shortId)}</span></div>
        <div class="meta-row"><span>${escapeHtml(t('dashboardPages.orders.orderDate'))}</span><span>${escapeHtml(formatDateTime(order.created_at, locale))}</span></div>
        <div class="meta-row"><span>${escapeHtml(t('dashboardPages.orders.printDate'))}</span><span>${escapeHtml(formatDateTime(new Date().toISOString(), locale))}</span></div>
      </div>
    </section>

    <section class="status-grid">
      <div class="status"><span>${escapeHtml(t('dashboardPages.orders.order'))}</span>${escapeHtml(statusLabel(order.status, t))}</div>
      <div class="status"><span>${escapeHtml(t('dashboardPages.orders.paymentStatus'))}</span>${escapeHtml(paymentStatusLabel(order.payment_status, t))}</div>
      <div class="status"><span>${escapeHtml(t('dashboardPages.orders.shipment'))}</span>${escapeHtml(fulfillmentLabel(order.fulfillment_status, t))}</div>
    </section>

    <section class="document-grid">
      <div class="card">
        <h2>${escapeHtml(t('dashboardPages.orders.customer'))}</h2>
        <p>${escapeHtml(customerName(order, t))}</p>
        <p>${escapeHtml(order.customer_email || t('dashboardPages.orders.emailUnavailable'))}</p>
        <p>${escapeHtml(order.customer_phone || order.shipping_address?.phone || t('dashboardPages.orders.phoneUnavailable'))}</p>
      </div>
      <div class="card">
        <h2>${escapeHtml(t('dashboardPages.orders.deliveryAddress'))}</h2>
        <p>${shippingAddress}</p>
      </div>
    </section>

    <section class="grid">
      <div class="card">
        <h2>${isInvoice ? escapeHtml(t('dashboardPages.orders.paymentStatus')) : escapeHtml(t('dashboardPages.orders.orderReference'))}</h2>
        <p>${isInvoice ? escapeHtml(t('dashboardPages.orders.method')) : escapeHtml(t('dashboardPages.orders.orderIdLabel'))}: ${escapeHtml(isInvoice ? order.payment_gateway?.replace(/_/g, ' ') || '—' : order.id)}</p>
        <p>${isInvoice ? escapeHtml(t('dashboardPages.orders.paymentReference')) : escapeHtml(t('dashboardPages.orders.orderDate'))}: ${escapeHtml(isInvoice ? order.payment_reference || '—' : formatDateTime(order.created_at, locale))}</p>
      </div>
      <div class="card">
        <h2>${escapeHtml(t('dashboardPages.orders.shipment'))}</h2>
        <p>${escapeHtml(t('dashboardPages.orders.carrier'))}: ${escapeHtml(order.carrier || '—')}</p>
        <p>${escapeHtml(t('dashboardPages.orders.tracking'))}: ${escapeHtml(order.tracking_number || '—')}</p>
        <p>${escapeHtml(t('dashboardPages.orders.shippedLabel'))}: ${escapeHtml(formatDateTime(order.shipped_at, locale))}</p>
        <p>${escapeHtml(t('dashboardPages.orders.deliveredLabel'))}: ${escapeHtml(formatDateTime(order.delivered_at, locale))}</p>
      </div>
    </section>

    <h2 class="section-title">${isInvoice ? escapeHtml(t('dashboardPages.orders.invoicedItems')) : escapeHtml(t('dashboardPages.orders.itemsToPrepare'))}</h2>
    <table>
      <thead>
        ${tableHeader}
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    ${totalsSection}

    <section class="footer">
      <span>${isInvoice ? escapeHtml(t('dashboardPages.orders.invoiceFooter', { marketplace: marketplaceName })) : escapeHtml(t('dashboardPages.orders.deliverySlipFooter'))}</span>
      <span>${escapeHtml(t('dashboardPages.orders.fullReference'))}: ${escapeHtml(order.id)}</span>
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

function openShipmentLabelDocument(order: Order, shipment: SellerOrderShipment, marketplaceName: string, t: (key: string, params?: Record<string, string | number>) => string, locale: string) {
  if (typeof window === 'undefined') return false;
  if (shipment.label_url) {
    return Boolean(window.open(shipment.label_url, '_blank', 'noopener,noreferrer'));
  }

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return false;
  const recipientLines = formatAddressLines(order.shipping_address, t).map((line) => escapeHtml(line)).join('<br />');
  const storeLines = storeContactLines(order, t).map((line) => escapeHtml(line)).join('<br />');
  const trackingUrl = getTrackingUrl(shipment.provider, shipment.tracking_number);
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(t('dashboardPages.orders.shippingLabel'))} ${escapeHtml(orderShortId(order))}</title>
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
        <p>${escapeHtml(t('dashboardPages.orders.sellerShippingLabel'))}</p>
      </div>
      <div>
        <p><strong>${escapeHtml(t('dashboardPages.orders.order'))}:</strong> #${escapeHtml(orderShortId(order))}</p>
        <p><strong>${escapeHtml(t('dashboardPages.orders.date'))}:</strong> ${escapeHtml(formatDateTime(new Date().toISOString(), locale))}</p>
      </div>
    </div>
    <div class="code">
      <span>${escapeHtml(shipmentCarrierLabel(shipment.provider))}</span>
      <strong>${escapeHtml(shipment.tracking_number)}</strong>
      ${trackingUrl ? `<p>${escapeHtml(trackingUrl)}</p>` : ''}
    </div>
    <div class="grid">
      <div class="block">
        <h2>${escapeHtml(t('dashboardPages.orders.sender'))}</h2>
        <p>${storeLines || escapeHtml(t('dashboardPages.orders.defaultSellerName'))}</p>
      </div>
      <div class="block">
        <h2>${escapeHtml(t('dashboardPages.orders.recipient'))}</h2>
        <p>${recipientLines || escapeHtml(t('dashboardPages.orders.addressUnavailable'))}</p>
      </div>
    </div>
    <div class="footer">${escapeHtml(t('dashboardPages.orders.shippingLabelFooter'))}</div>
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

function fulfillmentLabel(status: string | null | undefined, t: (key: string) => string) {
  if (!status) return t('dashboardPages.orders.notFulfillable');
  const labels: Record<string, string> = {
    pending: t('dashboardPages.orders.toShip'),
    preparing: t('dashboardPages.orders.preparing'),
    shipped: t('dashboardPages.orders.shipped'),
    delivered: t('dashboardPages.orders.delivered'),
    cancelled: t('dashboardPages.orders.cancelled'),
  };
  return labels[status] || status;
}

/** Carrier shipment lifecycle labels (pd_shipment.status) — the raw provider
 *  values are English and must not leak into the localized UI. */
function shipmentStatusLabel(status: string | null | undefined, t: (key: string) => string) {
  if (!status) return '—';
  const labels: Record<string, string> = {
    created: t('dashboardPages.orders.shipmentCreated'),
    picked_up: t('dashboardPages.orders.shipmentPickedUp'),
    in_transit: t('dashboardPages.orders.shipmentInTransit'),
    out_for_delivery: t('dashboardPages.orders.shipmentOutForDelivery'),
    delivered: t('dashboardPages.orders.delivered'),
    returned: t('dashboardPages.orders.shipmentReturned'),
    cancelled: t('dashboardPages.orders.cancelled'),
  };
  return labels[status] || status;
}

function fulfillmentColor(status?: string | null) {
  switch (status) {
    case 'pending': return 'bg-amber-50 text-amber-800 border-amber-200/60';
    case 'preparing': return 'bg-sky-50 text-sky-800 border-sky-200/60';
    case 'shipped': return 'bg-purple-50 text-purple-800 border-purple-200/60';
    case 'delivered': return 'bg-emerald-50 text-emerald-800 border-emerald-200/60';
    case 'cancelled': return 'bg-zinc-100 text-zinc-600 border-zinc-200/80';
    default: return 'bg-zinc-100 text-zinc-600 border-zinc-200/80';
  }
}

// Seller-facing gating is driven by the store's own fulfillment state only:
// the order-level aggregate can be advanced by other vendors' actions and must
// never disable this store's controls.
function canPrepare(order: Order) {
  return order.fulfillment_status === 'pending';
}

function canRevertPreparation(order: Order) {
  return order.fulfillment_status === 'preparing';
}

function canFulfill(order: Order) {
  return order.fulfillment_status === 'pending' || order.fulfillment_status === 'preparing';
}

function canMarkDelivered(order: Order) {
  return order.fulfillment_status === 'shipped';
}

function canCancelSellerFulfillment(order: Order) {
  return (order.fulfillment_status === 'pending' || order.fulfillment_status === 'preparing')
    && order.status !== 'refunded';
}

/**
 * Store-scoped order status for the seller: the fulfillment reality of THIS
 * store takes precedence over the marketplace-wide master order status.
 */
function storeOrderStatus(order: Order, t: (key: string) => string): { label: string; color: string } {
  if (order.fulfillment_status === 'cancelled' || order.status === 'cancelled') {
    return { label: t('dashboardPages.orders.cancelled'), color: 'bg-zinc-100 text-zinc-600 border-zinc-200/80' };
  }
  if (order.status === 'refunded' || order.payment_status === 'refunded') {
    return { label: t('dashboardPages.orders.refunded'), color: 'bg-zinc-100 text-zinc-600 border-zinc-200/80' };
  }
  if (order.fulfillment_status === 'delivered') {
    return { label: t('dashboardPages.orders.delivered'), color: 'bg-emerald-50 text-emerald-800 border-emerald-200/60' };
  }
  if (order.fulfillment_status === 'shipped') {
    return { label: t('dashboardPages.orders.shipped'), color: 'bg-purple-50 text-purple-800 border-purple-200/60' };
  }
  if (order.fulfillment_status === 'preparing') {
    return { label: t('dashboardPages.orders.preparing'), color: 'bg-sky-50 text-sky-800 border-sky-200/60' };
  }
  if (order.status === 'payment_required') {
    return { label: t('dashboardPages.orders.paymentRequired'), color: 'bg-orange-50 text-orange-800 border-orange-200/60' };
  }
  if (order.payment_status === 'captured') {
    return { label: t('dashboardPages.orders.confirmed'), color: 'bg-sky-50 text-sky-800 border-sky-200/60' };
  }
  return { label: t('dashboardPages.orders.toShip'), color: 'bg-amber-50 text-amber-800 border-amber-200/60' };
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

function buildOrderTimeline(order: Order, t: (key: string, params?: Record<string, string | number>) => string): TimelineStep[] {
  const isCancelled = order.status === 'cancelled' || order.fulfillment_status === 'cancelled';
  const isRefunded = order.status === 'refunded' || order.payment_status === 'refunded';
  const isPaid = order.payment_status === 'captured';
  const isShipped = order.fulfillment_status === 'shipped' || order.fulfillment_status === 'delivered' || order.status === 'fulfilled' || order.status === 'delivered';
  const isDelivered = order.fulfillment_status === 'delivered' || order.status === 'delivered';
  // Preparation reflects the real persisted state: done once the seller marked
  // the parcel prepared (or it already shipped), never auto-done at creation.
  const isPreparationDone = isShipped || order.fulfillment_status === 'preparing';

  if (isCancelled || isRefunded) {
    return [
      { label: t('dashboardPages.orders.timelineOrderCreated'), description: t('dashboardPages.orders.timelineOrderCreatedDesc'), date: order.created_at, state: 'done' },
      {
        label: isRefunded ? t('dashboardPages.orders.timelineRefund') : t('dashboardPages.orders.timelineCancellation'),
        description: isRefunded ? t('dashboardPages.orders.timelineRefundDesc') : t('dashboardPages.orders.timelineCancellationDesc'),
        date: order.delivered_at || order.shipped_at || order.created_at,
        state: 'failed',
      },
    ];
  }

  return [
    { label: t('dashboardPages.orders.timelineOrderCreated'), description: t('dashboardPages.orders.timelineOrderCreatedDesc'), date: order.created_at, state: 'done' },
    {
      label: t('dashboardPages.orders.timelinePaymentConfirmed'),
      description: isPaid ? t('dashboardPages.orders.timelinePaymentCaptured') : t('dashboardPages.orders.timelinePaymentPending'),
      date: isPaid ? order.created_at : undefined,
      state: isPaid ? 'done' : 'current',
    },
    {
      label: t('dashboardPages.orders.timelinePreparation'),
      description: isPreparationDone ? t('dashboardPages.orders.timelinePreparationReady') : t('dashboardPages.orders.timelinePreparationWaiting'),
      state: isPreparationDone ? 'done' : 'current',
    },
    {
      label: t('dashboardPages.orders.shipment'),
      description: isShipped ? t('dashboardPages.orders.timelineShippedDesc', { carrier: order.carrier || '' }) : t('dashboardPages.orders.timelineShippedWaiting'),
      date: order.shipped_at,
      state: isShipped ? 'done' : 'pending',
    },
    {
      label: t('dashboardPages.orders.timelineDelivery'),
      description: isDelivered ? t('dashboardPages.orders.timelineDeliveryConfirmed') : t('dashboardPages.orders.timelineDeliveryPending'),
      date: order.delivered_at,
      state: isDelivered ? 'done' : 'pending',
    },
  ];
}

export default function OrdersPage() {
  const { t, locale } = useLocale();
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
  const [detailLoadFailed, setDetailLoadFailed] = useState(false);
  const [fulfillOrderTarget, setFulfillOrderTarget] = useState<Order | null>(null);
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [fulfillingId, setFulfillingId] = useState('');
  const [preparingId, setPreparingId] = useState('');
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
  // Advanced COD, RTO & Settlement Tab Navigation
  const [mainTab, setMainTab] = useState<OrdersMainTab>('all_orders');

  // COD Pre-Validation & OTP State
  const [codOtpInput, setCodOtpInput] = useState('');
  const [sendingCodOtp, setSendingCodOtp] = useState(false);
  const [verifyingCodOtp, setVerifyingCodOtp] = useState(false);
  const [updatingCodStatus, setUpdatingCodStatus] = useState(false);
  const [codFeedback, setCodFeedback] = useState('');

  // RTO Return Action Modal State
  const [rtoOrderTarget, setRtoOrderTarget] = useState<Order | null>(null);
  const [rtoReasonCode, setRtoReasonCode] = useState<'client_refused' | 'unreachable' | 'wrong_address' | 'fake_order' | 'delayed_delivery' | 'damaged_in_transit' | 'customer_cancelled'>('client_refused');
  const [rtoNotes, setRtoNotes] = useState('');
  const [submittingRto, setSubmittingRto] = useState(false);

  // Courier Settlement Ledger State
  const [settlements, setSettlements] = useState<CourierSettlement[]>([]);
  const [settlementsLoading, setSettlementsLoading] = useState(false);
  const [settlementsSummary, setSettlementsSummary] = useState({
    total_collected: 0,
    total_courier_fees: 0,
    total_net_payout: 0,
    pending_payout: 0,
    settled_payout: 0,
    settled_count: 0,
    pending_count: 0,
  });
  const [settlementCarrierFilter, setSettlementCarrierFilter] = useState('all');
  const [settlementStatusFilter, setSettlementStatusFilter] = useState('all');
  const [reconcileOrderTarget, setReconcileOrderTarget] = useState<Order | null>(null);
  const [reconcileCarrier, setReconcileCarrier] = useState('aramex');
  const [reconcileCollectedAmount, setReconcileCollectedAmount] = useState('');
  const [reconcileCourierFee, setReconcileCourierFee] = useState('7.000');
  const [reconcileRef, setReconcileRef] = useState('');
  const [reconcileStatus, setReconcileStatus] = useState<'pending' | 'settled' | 'disputed'>('settled');
  const [reconcileNotes, setReconcileNotes] = useState('');
  const [savingSettlement, setSavingSettlement] = useState(false);


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
        setError(await getErrorMessage(res, t('dashboardPages.orders.errorLoadingOrders')));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.orders.errorNetwork'));
    } finally {
      setLoading(false);
    }
  }, [channelFilter, countryFilter, customerFilter, dateFrom, dateTo, fulfillmentStatusFilter, hasDisputeFilter, page, paymentGatewayFilter, paymentStatusFilter, productFilter, search, statusFilter, t]);

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (fulfillOrderTarget) setFulfillOrderTarget(null);
        else if (deliveryProofTarget) setDeliveryProofTarget(null);
        else if (refundOrderTarget) setRefundOrderTarget(null);
        else if (bulkFulfillmentTargets.length > 0) {
          setBulkFulfillmentTargets([]);
          setBulkFulfillmentDrafts({});
        } else if (rtoOrderTarget) setRtoOrderTarget(null);
        else if (reconcileOrderTarget) setReconcileOrderTarget(null);
        else if (selectedOrder) setSelectedOrder(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    fulfillOrderTarget,
    deliveryProofTarget,
    refundOrderTarget,
    bulkFulfillmentTargets.length,
    rtoOrderTarget,
    reconcileOrderTarget,
    selectedOrder,
  ]);

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

  const startPreparation = async (order: Order) => {
    setPreparingId(order.id);
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/store/${order.id}/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        setError(await getErrorMessage(res, t('dashboardPages.orders.errorPreparing')));
        return;
      }
      await fetchOrders();
      if (selectedOrder?.id === order.id) {
        await openOrderDetail(order);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.orders.errorNetwork'));
    } finally {
      setPreparingId('');
    }
  };

  const revertPreparation = async (order: Order) => {
    setPreparingId(order.id);
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/store/${order.id}/prepare/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        setError(await getErrorMessage(res, t('dashboardPages.orders.errorRevertingPreparation')));
        return;
      }
      await fetchOrders();
      if (selectedOrder?.id === order.id) {
        await openOrderDetail(order);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.orders.errorNetwork'));
    } finally {
      setPreparingId('');
    }
  };

  const openOrderDetail = async (order: Order) => {
    setSelectedOrder(order);
    setSellerNote(order.seller_note?.body || '');
    setNoteFeedback('');
    setLoadingOrderDetail(true);
    setDetailLoadFailed(false);
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/store/${order.id}`, { credentials: 'include' });
      if (!res.ok) {
        setDetailLoadFailed(true);
        setError(await getErrorMessage(res, t('dashboardPages.orders.errorLoadingDetail')));
        return;
      }
      const data = await res.json();
      const detail = data.order || order;
      setSelectedOrder(detail);
      setSellerNote(detail.seller_note?.body || '');
    } catch (err) {
      setDetailLoadFailed(true);
      setError(err instanceof Error ? err.message : t('dashboardPages.orders.errorNetwork'));
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
        setError(await getErrorMessage(res, t('dashboardPages.orders.errorFulfilling')));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.orders.errorNetwork'));
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
      const opened = openShipmentLabelDocument(order, existingShipment, marketplaceName, t, locale);
      if (!opened) setError(t('dashboardPages.orders.errorCannotOpenLabel'));
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
        setError(await getErrorMessage(res, t('dashboardPages.orders.errorGeneratingLabel')));
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
      const opened = openShipmentLabelDocument(nextOrder, shipment, marketplaceName, t, locale);
      if (!opened) setError(t('dashboardPages.orders.errorLabelGeneratedCannotOpen'));
      await fetchOrders();
      if (selectedOrder?.id === order.id) await openOrderDetail(nextOrder);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.orders.errorNetwork'));
    } finally {
      setGeneratingLabelId('');
    }
  };

  const openDeliveryProofModal = (order: Order) => {
    setDeliveryProofTarget(order);
    setDeliveryProofFile(null);
    setDeliveryProofReceivedBy(customerName(order, t));
    setDeliveryProofNote('');
    setError('');
  };

  const uploadDeliveryProofFile = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      throw new Error(t('dashboardPages.orders.errorInvalidProofFormat'));
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error(t('dashboardPages.orders.errorProofTooLarge'));
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
    if (!presignRes.ok) throw new Error(await getErrorMessage(presignRes, t('dashboardPages.orders.errorUploadFailed')));
    const presignData = await presignRes.json();
    if (!presignData.upload_url || !presignData.file_key) throw new Error(t('dashboardPages.orders.errorMissingUploadUrl'));

    const uploadRes = await fetch(presignData.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!uploadRes.ok) throw new Error(t('dashboardPages.orders.errorProofUploadFailed'));
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
        setError(await getErrorMessage(res, t('dashboardPages.orders.errorMarkingDelivered')));
        return;
      }
      const deliveredOrder = deliveryProofTarget;
      setDeliveryProofTarget(null);
      setDeliveryProofFile(null);
      setDeliveryProofReceivedBy('');
      setDeliveryProofNote('');
      await refreshOrderAfterStatusChange(deliveredOrder);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.orders.errorNetwork'));
    } finally {
      setSubmittingDeliveryProofId('');
    }
  };

  const openDeliveryProofFile = async (proofUrl: string | null | undefined) => {
    if (!proofUrl) return;
    try {
      if (proofUrl.startsWith('/api/pd/files/access')) {
        const res = await fetchWithCsrf(proofUrl, { credentials: 'include' });
        if (!res.ok) throw new Error(await getErrorMessage(res, t('dashboardPages.orders.proofInaccessible')));
        const data = await res.json();
        if (data.download_url) window.open(data.download_url, '_blank', 'noopener,noreferrer');
        return;
      }
      window.open(proofUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.orders.proofInaccessible'));
    }
  };

  const markOrderDelivered = async (order: Order) => {
    openDeliveryProofModal(order);
  };

  const cancelSellerFulfillment = async (order: Order) => {
    const reason = window.prompt(t('dashboardPages.orders.cancelFulfillmentPrompt'));
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
        setError(await getErrorMessage(res, t('dashboardPages.orders.errorCancelling')));
        return;
      }
      await refreshOrderAfterStatusChange(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.orders.errorNetwork'));
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
      setError(t('dashboardPages.orders.errorRefundAmount', { max: formatMoney(remaining, refundOrderTarget.currency || 'TND') }));
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
        setError(await getErrorMessage(res, t('dashboardPages.orders.errorRefundRequest')));
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
      setError(err instanceof Error ? err.message : t('dashboardPages.orders.errorNetwork'));
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
        setError(await getErrorMessage(res, t('dashboardPages.orders.errorExporting')));
        return;
      }
      const data = await res.json();
      const rows = (data.data || []) as Order[];
      const columns: CsvColumn[] = [
        { key: 'id', label: t('dashboardPages.orders.csvOrderId') },
        { key: 'created_at', label: t('dashboardPages.orders.date'), formatter: (value) => formatDateTime(String(value || ''), locale) },
        { key: 'customer', label: t('dashboardPages.orders.customer') },
        { key: 'customer_email', label: t('dashboardPages.orders.csvEmail') },
        { key: 'status', label: t('dashboardPages.orders.csvOrderStatus'), formatter: (value) => statusLabel(String(value || ''), t) },
        { key: 'payment_status', label: t('dashboardPages.orders.csvPaymentStatus'), formatter: (value) => paymentStatusLabel(String(value || ''), t) },
        { key: 'fulfillment_status', label: t('dashboardPages.orders.fulfillment'), formatter: (value) => fulfillmentLabel(String(value || ''), t) },
        { key: 'carrier', label: t('dashboardPages.orders.carrier') },
        { key: 'tracking_number', label: t('dashboardPages.orders.csvTrackingNumber') },
        { key: 'store_total', label: t('dashboardPages.orders.storeTotal') },
        { key: 'currency', label: t('dashboardPages.orders.csvCurrency') },
      ];
      exportToCsv(
        rows.map((order) => ({
          ...order,
          customer: customerName(order, t),
          store_total: formatMoney(order.store_total ?? order.total, order.currency || 'TND'),
        })) as Record<string, unknown>[],
        `seller-orders-${new Date().toISOString().slice(0, 10)}.csv`,
        columns,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.orders.errorNetwork'));
    } finally {
      setExportingOrders(false);
    }
  };

  const selectedOrders = orders.filter((order) => selectedOrderIds.includes(order.id));

  const exportSelectedOrders = () => {
    if (selectedOrders.length === 0) return;
      const columns: CsvColumn[] = [
        { key: 'id', label: t('dashboardPages.orders.csvOrderId') },
        { key: 'created_at', label: t('dashboardPages.orders.date'), formatter: (value) => formatDateTime(String(value || ''), locale) },
        { key: 'customer', label: t('dashboardPages.orders.customer') },
        { key: 'customer_email', label: t('dashboardPages.orders.csvEmail') },
        { key: 'status', label: t('dashboardPages.orders.csvOrderStatus'), formatter: (value) => statusLabel(String(value || ''), t) },
        { key: 'payment_gateway', label: t('dashboardPages.orders.csvPaymentMethod') },
        { key: 'payment_status', label: t('dashboardPages.orders.csvPaymentStatus'), formatter: (value) => paymentStatusLabel(String(value || ''), t) },
        { key: 'fulfillment_status', label: t('dashboardPages.orders.fulfillment'), formatter: (value) => fulfillmentLabel(String(value || ''), t) },
        { key: 'carrier', label: t('dashboardPages.orders.carrier') },
        { key: 'tracking_number', label: t('dashboardPages.orders.csvTrackingNumber') },
        { key: 'store_total', label: t('dashboardPages.orders.storeTotal') },
        { key: 'currency', label: t('dashboardPages.orders.csvCurrency') },
      ];
    exportToCsv(
      selectedOrders.map((order) => ({
        ...order,
        customer: customerName(order, t),
        store_total: formatMoney(order.store_total ?? order.total, order.currency || 'TND'),
      })) as Record<string, unknown>[],
      `seller-orders-selected-${new Date().toISOString().slice(0, 10)}.csv`,
      columns,
    );
  };

  /**
   * Fetch the store-scoped detail (which is the only payload carrying `items`)
   * before printing, so invoices and delivery slips generated from the list
   * never render the "items unavailable" row (audit P2-9).
   */
  const fetchOrderDetailForPrint = async (order: Order): Promise<Order> => {
    if ((order.items || []).length > 0) return order;
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/store/${order.id}`, { credentials: 'include' });
      if (!res.ok) return order;
      const data = await res.json();
      return (data.order as Order) || order;
    } catch {
      return order;
    }
  };

  const printSelectedOrders = async (kind: PrintDocumentKind) => {
    if (selectedOrders.length === 0) return;
    const detailed = await Promise.all(selectedOrders.map(fetchOrderDetailForPrint));
    detailed.forEach((order) => {
      openOrderPrintDocument(order, kind, marketplaceName, t, locale);
    });
  };

  const openBulkFulfillment = () => {
    const fulfillableOrders = selectedOrders.filter(canFulfill);
    if (fulfillableOrders.length === 0) {
      setError(t('dashboardPages.orders.errorNoFulfillableSelected'));
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
        setError(t('dashboardPages.orders.errorBulkFulfillmentFailed', { ids: failed.map((order) => `#${order.id.slice(-8).toUpperCase()}`).join(', ') }));
        return;
      }
      setSelectedOrderIds((current) => current.filter((id) => !bulkFulfillmentTargets.some((order) => order.id === id)));
      setBulkFulfillmentTargets([]);
      setBulkFulfillmentDrafts({});
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.orders.errorNetwork'));
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
        throw new Error(data?.error?.message || data?.message || t('dashboardPages.orders.errorSavingNote'));
      }
      setSelectedOrder((current) => current ? { ...current, seller_note: data.note } : current);
      setSellerNote(data.note?.body || '');
      setNoteFeedback(t('dashboardPages.orders.noteSaved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.orders.errorNetwork'));
    } finally {
      setSavingNote(false);
    }
  };

  const printSelectedOrder = (kind: PrintDocumentKind) => {
    if (!selectedOrder) return;
    if (loadingOrderDetail) {
      setError(t('dashboardPages.orders.errorDetailLoading'));
      return;
    }
    const opened = openOrderPrintDocument(selectedOrder, kind, marketplaceName, t, locale);
    if (!opened) {
      setError(t('dashboardPages.orders.errorCannotOpenPrint'));
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
      if (!res.ok) throw new Error(data?.error?.message || t('dashboardPages.orders.errorCannotStartChat'));
      window.location.href = `/hub/dashboard/messages?conversation=${encodeURIComponent(data.conversation.id)}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.orders.errorChatUnavailable'));
    } finally {
      setStartingChatId('');
    }
  };

  
  // COD Risk & Pre-Validation Handlers
  const handleUpdateCodStatus = async (orderId: string, status: 'pending' | 'confirmed' | 'rejected' | 'unreachable' | 'otp_verified', callAttemptsDelta: number = 0, customNotes?: string) => {
    setUpdatingCodStatus(true);
    setCodFeedback('');
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/store/${orderId}/cod-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status,
          call_attempts_delta: callAttemptsDelta,
          notes: customNotes,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message || t('dashboardPages.orders.codUpdateError'));
      
      setCodFeedback(status === 'confirmed' ? t('dashboardPages.orders.codConfirmedSuccess') : t('dashboardPages.orders.codStatusUpdated', { status }));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, cod_verification: data.verification, cod_status: data.verification.status });
      }
      await fetchOrders();
    } catch (err) {
      setCodFeedback(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setUpdatingCodStatus(false);
    }
  };

  const handleSendCodOtp = async (orderId: string) => {
    setSendingCodOtp(true);
    setCodFeedback('');
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/store/${orderId}/cod-otp/send`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message || t('dashboardPages.orders.errorSendingOtp'));
      // The backend never returns the code itself (it is SMS-delivered to the
      // customer); show a neutral confirmation only.
      setCodFeedback(
        data?.channel === 'none'
          ? t('dashboardPages.orders.otpNoChannel')
          : t('dashboardPages.orders.otpSentToCustomer'),
      );
    } catch (err) {
      setCodFeedback(err instanceof Error ? err.message : t('dashboardPages.orders.errorNetwork'));
    } finally {
      setSendingCodOtp(false);
    }
  };

  const handleVerifyCodOtp = async (orderId: string) => {
    if (!codOtpInput.trim()) return;
    setVerifyingCodOtp(true);
    setCodFeedback('');
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/store/${orderId}/cod-otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: codOtpInput.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message || 'Code OTP incorrect');
      setCodFeedback(t('dashboardPages.orders.otpVerifiedSuccess'));
      setCodOtpInput('');
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, cod_verification: data.verification, cod_status: 'otp_verified', cod_risk_score: 0 });
      }
      await fetchOrders();
    } catch (err) {
      setCodFeedback(err instanceof Error ? err.message : 'Code OTP invalide');
    } finally {
      setVerifyingCodOtp(false);
    }
  };

  const handleSubmitRto = async () => {
    if (!rtoOrderTarget) return;
    setSubmittingRto(true);
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/store/${rtoOrderTarget.id}/rto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reason_code: rtoReasonCode,
          notes: rtoNotes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || 'Erreur enregistrement retour RTO');
      }
      setRtoOrderTarget(null);
      setRtoNotes('');
      await fetchOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setSubmittingRto(false);
    }
  };

  const fetchSettlements = useCallback(async () => {
    setSettlementsLoading(true);
    try {
      const params = new URLSearchParams();
      if (settlementCarrierFilter !== 'all') params.set('carrier', settlementCarrierFilter);
      if (settlementStatusFilter !== 'all') params.set('status', settlementStatusFilter);

      const res = await fetchWithCsrf(`/api/pd/orders/store-settlements?${params.toString()}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setSettlements(data.settlements || []);
        setSettlementsSummary(data.summary || {
          total_collected: 0,
          total_courier_fees: 0,
          total_net_payout: 0,
          pending_payout: 0,
          settled_payout: 0,
          settled_count: 0,
          pending_count: 0,
        });
      }
    } catch {
      // ignore
    } finally {
      setSettlementsLoading(false);
    }
  }, [settlementCarrierFilter, settlementStatusFilter]);

  useEffect(() => {
    if (mainTab === 'courier_settlements') {
      fetchSettlements();
    }
  }, [mainTab, fetchSettlements]);

  const handleSaveCourierSettlement = async () => {
    if (!reconcileOrderTarget) return;
    setSavingSettlement(true);
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/store/${reconcileOrderTarget.id}/settlement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          carrier: reconcileCarrier,
          tracking_number: reconcileOrderTarget.tracking_number || undefined,
          collected_amount: parseFloat(reconcileCollectedAmount) || 0,
          courier_fee: parseFloat(reconcileCourierFee) || 0,
          status: reconcileStatus,
          settlement_reference: reconcileRef.trim() || undefined,
          notes: reconcileNotes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || 'Erreur enregistrement rapprochement');
      }
      setReconcileOrderTarget(null);
      setReconcileRef('');
      setReconcileNotes('');
      await fetchOrders();
      if (mainTab === 'courier_settlements') {
        await fetchSettlements();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setSavingSettlement(false);
    }
  };

  const exportSettlementsCsv = () => {
    if (settlements.length === 0) return;
    const rows = [
      ['ID Commande', 'Transporteur', 'N° Suivi', 'Montant Collecté (TND)', 'Frais Livraison (TND)', 'Net Vendeur (TND)', 'Statut', 'Référence Rapprochement'],
      ...settlements.map((st) => [
        `#${st.order_id.slice(-8).toUpperCase()}`,
        st.carrier,
        st.tracking_number || '',
        String(st.collected_amount),
        String(st.courier_fee),
        String(st.net_payout),
        st.status,
        st.settlement_reference || '',
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rapprochements-transporteurs-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRtoLabel = (code?: string | null) => {
    switch (code) {
      case 'client_refused': return t('dashboardPages.orders.rtoReasonClientRefused');
      case 'unreachable': return t('dashboardPages.orders.rtoReasonUnreachable');
      case 'wrong_address': return t('dashboardPages.orders.rtoReasonWrongAddress');
      case 'fake_order': return t('dashboardPages.orders.rtoReasonFakeOrder');
      case 'delayed_delivery': return t('dashboardPages.orders.rtoReasonDelayedDelivery');
      case 'damaged_in_transit': return t('dashboardPages.orders.rtoReasonDamagedInTransit');
      case 'customer_cancelled': return t('dashboardPages.orders.rtoReasonCustomerCancelled');
      default: return code || t('dashboardPages.orders.rtoReasonDefault');
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
      {/* Quieter Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t('dashboardPages.orders.ordersTitle')}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('dashboardPages.orders.ordersSubtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchOrders()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-60 shadow-2xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {t('dashboardPages.orders.refresh')}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200/60 bg-rose-50 p-4 text-xs font-medium text-rose-800">
          <X className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setMainTab('all_orders')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-colors ${
            mainTab === 'all_orders'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-normal'
          }`}
        >
          <Package className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
          <span>{t('dashboardPages.orders.tabAllOrders')}</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
            {meta.total || orders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('cod_radar')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-colors ${
            mainTab === 'cod_radar'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-normal'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>{t('dashboardPages.orders.tabCodRadar')}</span>
          {orders.filter(o => o.payment_gateway === 'cod' && (!o.cod_status || o.cod_status === 'pending')).length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-medium">
              {t('dashboardPages.orders.badgeToValidate', { count: orders.filter(o => o.payment_gateway === 'cod' && (!o.cod_status || o.cod_status === 'pending')).length })}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMainTab('rto_returns')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-colors ${
            mainTab === 'rto_returns'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-normal'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          <span>{t('dashboardPages.orders.tabRtoReturns')}</span>
          {orders.filter(o => Boolean(o.rto_reason_code) || o.status === 'cancelled').length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-medium">
              {t('dashboardPages.orders.badgeReturns', { count: orders.filter(o => Boolean(o.rto_reason_code) || o.status === 'cancelled').length })}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMainTab('courier_settlements')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-colors ${
            mainTab === 'courier_settlements'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-normal'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{t('dashboardPages.orders.tabSettlements')}</span>
          {settlementsSummary.pending_payout > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium">
              {t('dashboardPages.orders.badgeDue', { amount: formatMoney(settlementsSummary.pending_payout) })}
            </span>
          )}
        </button>
      </div>

      {/* Quieter KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
        {[
          { label: t('dashboardPages.orders.revenue30d'), value: formatMoney(summary?.revenue_30d ?? 0), icon: TrendingUp },
          { label: t('dashboardPages.orders.revenue7d'), value: formatMoney(summary?.revenue_7d ?? 0), icon: TrendingUp },
          { label: t('dashboardPages.orders.revenueToday'), value: formatMoney(summary?.revenue_today ?? 0), icon: CalendarDays },
          { label: t('dashboardPages.orders.toShip'), value: String(summary?.to_ship ?? 0), icon: PackageCheck },
          { label: t('dashboardPages.orders.aov'), value: formatMoney(summary?.average_order_value ?? 0), icon: CreditCard },
          { label: t('dashboardPages.orders.refunds'), value: formatPercent(summary?.refund_rate ?? 0), icon: Ban },
          { label: t('dashboardPages.orders.sla48h'), value: formatPercent(summary?.fulfillment_sla_rate ?? 0), detail: `${t('dashboardPages.orders.avgLabel')} ${formatHours(summary?.average_fulfillment_hours ?? 0, t)}`, icon: CheckCircle2 },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs transition-all hover:border-slate-300 dark:hover:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">{item.label}</span>
              <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-500 dark:text-slate-400">
                <item.icon className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">{item.value}</p>
            {'detail' in item && item.detail && <p className="mt-0.5 text-[10px] text-slate-400">{item.detail}</p>}
          </div>
        ))}
      </div>

      {/* TAB 1: ALL ORDERS STANDARD VIEW */}
      {/* TAB 1: ALL ORDERS STANDARD VIEW */}
      {mainTab === 'all_orders' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        {/* Toolbar */}
        <div className="space-y-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder={t('dashboardPages.orders.searchPlaceholder')}
                className="w-full pl-9 pr-9 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs font-normal text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none transition-all shadow-2xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  aria-label="Effacer la recherche"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
              <select
                value={statusFilter}
                onChange={(event) => handleStatusChange(event.target.value)}
                className="min-w-[140px] flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-normal text-slate-700 dark:text-slate-200 outline-none transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs lg:flex-none"
              >
                <option value="">{t('dashboardPages.orders.filterAll')}</option>
                <option value="pending">{t('dashboardPages.orders.pending')}</option>
                <option value="payment_required">{t('dashboardPages.orders.paymentRequired')}</option>
                <option value="processing">{t('dashboardPages.orders.confirmed')}</option>
                <option value="fulfilled">{t('dashboardPages.orders.shipped')}</option>
                <option value="delivered">{t('dashboardPages.orders.delivered')}</option>
                <option value="cancelled">{t('dashboardPages.orders.cancelled')}</option>
              </select>
              <select
                value={paymentGatewayFilter}
                onChange={(event) => handlePaymentGatewayChange(event.target.value)}
                className="min-w-[140px] flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-normal text-slate-700 dark:text-slate-200 outline-none transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs lg:flex-none"
              >
                <option value="">{t('dashboardPages.orders.allPaymentMethods')}</option>
                <option value="flouci">Flouci</option>
                <option value="konnect">Konnect</option>
                <option value="manual_mandat">{t('dashboardPages.orders.mandat')}</option>
                <option value="cod">COD</option>
              </select>
              <select
                value={paymentStatusFilter}
                onChange={(event) => handlePaymentStatusChange(event.target.value)}
                className="min-w-[140px] flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-normal text-slate-700 dark:text-slate-200 outline-none transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs lg:flex-none"
              >
                <option value="">{t('dashboardPages.orders.allPayments')}</option>
                <option value="pending">{t('dashboardPages.orders.pending')}</option>
                <option value="captured">{t('dashboardPages.orders.paid')}</option>
                <option value="failed">{t('dashboardPages.orders.failed')}</option>
                <option value="refunded">{t('dashboardPages.orders.refunded')}</option>
              </select>
              <select
                value={fulfillmentStatusFilter}
                onChange={(event) => handleFulfillmentStatusChange(event.target.value)}
                className="min-w-[140px] flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-normal text-slate-700 dark:text-slate-200 outline-none transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs lg:flex-none"
              >
                <option value="">{t('dashboardPages.orders.allFulfillment')}</option>
                <option value="pending">{t('dashboardPages.orders.toShip')}</option>
                <option value="preparing">{t('dashboardPages.orders.preparing')}</option>
                <option value="shipped">{t('dashboardPages.orders.shipped')}</option>
                <option value="delivered">{t('dashboardPages.orders.delivered')}</option>
                <option value="cancelled">{t('dashboardPages.orders.cancelled')}</option>
              </select>
              <button
                type="button"
                onClick={() => setShowAdvancedFilters((value) => !value)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs"
              >
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <span>{t('dashboardPages.orders.advanced')}</span>
                {[
                  Boolean(customerFilter),
                  Boolean(productFilter),
                  Boolean(channelFilter),
                  Boolean(countryFilter),
                  Boolean(hasDisputeFilter),
                  Boolean(dateFrom),
                  Boolean(dateTo),
                ].filter(Boolean).length > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                    {[
                      Boolean(customerFilter),
                      Boolean(productFilter),
                      Boolean(channelFilter),
                      Boolean(countryFilter),
                      Boolean(hasDisputeFilter),
                      Boolean(dateFrom),
                      Boolean(dateTo),
                    ].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>
          </div>
          {showAdvancedFilters && (
            <div className="grid gap-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 md:grid-cols-2 xl:grid-cols-5">
              <input
                value={customerFilter}
                onChange={(event) => updateAdvancedFilter(setCustomerFilter, event.target.value)}
                placeholder={t('dashboardPages.orders.customerPlaceholder')}
                className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-normal text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400"
              />
              <input
                value={productFilter}
                onChange={(event) => updateAdvancedFilter(setProductFilter, event.target.value)}
                placeholder={t('dashboardPages.orders.productPlaceholder')}
                className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-normal text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400"
              />
              <select
                value={channelFilter}
                onChange={(event) => updateAdvancedFilter(setChannelFilter, event.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-normal text-slate-700 dark:text-slate-200 outline-none focus:border-slate-400"
              >
                <option value="">{t('dashboardPages.orders.allChannels')}</option>
                <option value="marketplace">Marketplace</option>
                <option value="storefront">Storefront</option>
              </select>
              <input
                value={countryFilter}
                onChange={(event) => updateAdvancedFilter(setCountryFilter, event.target.value.toUpperCase().slice(0, 2))}
                placeholder={t('dashboardPages.orders.countryPlaceholder')}
                maxLength={2}
                className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-normal uppercase text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400"
              />
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasDisputeFilter}
                  onChange={(event) => updateHasDisputeFilter(event.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900"
                />
                {t('dashboardPages.orders.hasDispute')}
              </label>
            </div>
          )}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200/70 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <input
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                placeholder={t('dashboardPages.orders.presetNamePlaceholder')}
                className="min-w-[160px] rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-normal outline-none focus:border-slate-400"
              />
              <button
                type="button"
                onClick={saveCurrentPreset}
                disabled={!presetName.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 shadow-2xs"
              >
                <Save className="h-3.5 w-3.5" />
                {t('dashboardPages.orders.savePreset')}
              </button>
              {savedPresets.map((preset) => (
                <span key={preset.id} className="inline-flex overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-normal">
                  <button type="button" onClick={() => applyPreset(preset)} className="px-2.5 py-1 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700">
                    {preset.name}
                  </button>
                  <button type="button" onClick={() => deletePreset(preset.id)} className="border-l border-slate-200 dark:border-slate-700 px-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.columns')}</span>
              {ORDER_COLUMNS.map((column) => (
                <label key={column.key} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-normal text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns[column.key]}
                    disabled={column.required}
                    onChange={() => toggleColumn(column.key)}
                    className="h-3 w-3 rounded text-slate-900"
                  />
                  {t(column.labelKey)}
                </label>
              ))}
            </div>
          </div>
          {selectedOrderIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-900 text-white p-3 shadow-sm animate-in fade-in">
              <span className="mr-2 text-xs font-semibold text-white">{t('dashboardPages.orders.selectedCount', { count: selectedOrderIds.length })}</span>
              <button type="button" onClick={() => void printSelectedOrders('delivery_slip')} className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors">{t('dashboardPages.orders.printLabels')}</button>
              <button type="button" onClick={() => void printSelectedOrders('invoice')} className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors">{t('dashboardPages.orders.printInvoices')}</button>
              <button type="button" onClick={openBulkFulfillment} className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white transition-colors shadow-2xs">{t('dashboardPages.orders.markShipped')}</button>
              <button type="button" onClick={exportSelectedOrders} className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors">{t('dashboardPages.orders.exportSelected')}</button>
              <button type="button" onClick={() => setSelectedOrderIds([])} className="rounded-lg px-2 py-1 text-xs font-normal text-slate-400 hover:text-white transition-colors">{t('dashboardPages.orders.clear')}</button>
            </div>
          )}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-2 sm:grid-cols-2 lg:flex">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-normal text-slate-600 dark:text-slate-300">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                <span>{t('dashboardPages.orders.from')}</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => handleDateFromChange(event.target.value)}
                  className="min-w-0 bg-transparent outline-none text-xs"
                />
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-normal text-slate-600 dark:text-slate-300">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                <span>{t('dashboardPages.orders.to')}</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => handleDateToChange(event.target.value)}
                  className="min-w-0 bg-transparent outline-none text-xs"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[11px] font-normal text-slate-400">
                {t('dashboardPages.orders.resultCount', { total: meta.total, filters: hasActiveFilters ? ` · ${t('dashboardPages.orders.filterCount', { count: activeFilterCount })}` : '' })}
              </span>
              <button
                type="button"
                onClick={() => void exportFilteredOrders()}
                disabled={exportingOrders || loading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 shadow-2xs"
              >
                {exportingOrders ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 text-slate-400" />}
                {t('dashboardPages.orders.exportCsv')}
              </button>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs"
                >
                  {t('dashboardPages.orders.reset')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
              <span className="ml-2 text-xs text-slate-500">{t('dashboardPages.orders.loadingOrders')}</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800 p-3.5 text-slate-400">
                <Truck className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t('dashboardPages.orders.noOrders')}</p>
              <p className="mt-1 text-xs text-slate-400 max-w-sm">{t('dashboardPages.orders.noOrdersHint')}</p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('dashboardPages.orders.reset')}</span>
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <th className="px-4 py-3 font-medium">
                    <input
                      type="checkbox"
                      checked={orders.length > 0 && orders.every((order) => selectedOrderIds.includes(order.id))}
                      onChange={toggleAllVisibleOrders}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900"
                    />
                  </th>
                  {visibleColumns.id && <th className="px-5 py-3 font-medium">{t('dashboardPages.orders.orderNumber')}</th>}
                  {visibleColumns.date && <th className="px-5 py-3 font-medium">{t('dashboardPages.orders.date')}</th>}
                  {visibleColumns.customer && <th className="px-5 py-3 font-medium">{t('dashboardPages.orders.customer')}</th>}
                  {visibleColumns.payment && <th className="px-5 py-3 font-medium">{t('dashboardPages.orders.paymentStatus')}</th>}
                  {visibleColumns.total && <th className="px-5 py-3 font-medium">{t('dashboardPages.orders.total')}</th>}
                  {visibleColumns.status && <th className="px-5 py-3 font-medium">{t('dashboardPages.orders.status')}</th>}
                  {visibleColumns.fulfillment && <th className="px-5 py-3 font-medium">{t('dashboardPages.orders.fulfillment')}</th>}
                  {visibleColumns.actions && <th className="px-5 py-3 font-medium text-right">{t('dashboardPages.orders.actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map((order) => {
                  const openReportCount = toNumber(order.open_report_count);
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900"
                        />
                      </td>
                      {visibleColumns.id && (
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex w-fit items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                              #{order.id.slice(-8).toUpperCase()}
                            </span>
                            {openReportCount > 0 && (
                              <span className="inline-flex w-fit rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 border border-rose-200/60">
                                {t('dashboardPages.orders.disputeCount', { count: openReportCount })}
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleColumns.date && (
                        <td className="px-5 py-3.5 text-xs text-slate-500 font-normal">
                          {new Date(order.created_at).toLocaleDateString(locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                      )}
                      {visibleColumns.customer && (
                        <td className="px-5 py-3.5 text-xs">
                          <p className="font-semibold text-slate-900 dark:text-white">{customerName(order, t)}</p>
                          {order.customer_email && <p className="text-[11px] text-slate-400 mt-0.5">{order.customer_email}</p>}
                        </td>
                      )}
                      {visibleColumns.payment && (
                        <td className="px-5 py-3.5 text-xs">
                          <p className="font-medium capitalize text-slate-700 dark:text-slate-300">
                            {order.payment_gateway?.replace('_', ' ') || '—'}
                          </p>
                          <span className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${paymentStatusColor(order.payment_status)}`}>
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
                            {paymentStatusLabel(order.payment_status, t)}
                          </span>
                        </td>
                      )}
                      {visibleColumns.total && (
                        <td className="px-5 py-3.5 text-xs text-slate-900 dark:text-white">
                          <span className="font-semibold">{formatMoney(order.store_total ?? order.total, order.currency || 'TND')}</span>
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-5 py-3.5">
                          {(() => {
                            const store = storeOrderStatus(order, t);
                            return (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${store.color}`}>
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
                                {store.label}
                              </span>
                            );
                          })()}
                          <p className="mt-1 text-[10px] text-slate-400">
                            {t('dashboardPages.orders.marketplaceStatus')}: {statusLabel(order.status, t)}
                          </p>
                          {toNumber(order.other_pending_stores) > 0 && (
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {t('dashboardPages.orders.waitingOtherStores', { count: toNumber(order.other_pending_stores) })}
                            </p>
                          )}
                        </td>
                      )}
                      {visibleColumns.fulfillment && (
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${fulfillmentColor(order.fulfillment_status)}`}>
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
                            {fulfillmentLabel(order.fulfillment_status, t)}
                          </span>
                          {order.tracking_number && (
                            getTrackingUrl(order.carrier, order.tracking_number) ? (
                              <a
                                href={getTrackingUrl(order.carrier, order.tracking_number)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900"
                              >
                                {order.tracking_number}
                                <ExternalLink className="h-2.5 w-2.5 text-slate-400" />
                              </a>
                            ) : (
                              <p className="mt-1 text-[11px] text-slate-500">{order.tracking_number}</p>
                            )
                          )}
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="px-5 py-3.5 text-right text-xs">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => void openOrderDetail(order)}
                              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title={t('dashboardPages.orders.viewDetails')}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => startBuyerChat(order)}
                              disabled={startingChatId === order.id}
                              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40"
                              title={t('dashboardPages.orders.messageBuyer')}
                            >
                              {startingChatId === order.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <MessageSquare className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => void generateShippingLabel(order)}
                              disabled={generatingLabelId === order.id || !canGenerateShippingLabel(order)}
                              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40"
                              title={t('dashboardPages.orders.carrierLabel')}
                            >
                              {generatingLabelId === order.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <ReceiptText className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => void (canRevertPreparation(order) ? revertPreparation(order) : startPreparation(order))}
                              disabled={preparingId === order.id || (!canPrepare(order) && !canRevertPreparation(order))}
                              className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                                canRevertPreparation(order)
                                  ? 'text-sky-700 bg-sky-50 hover:bg-sky-100'
                                  : 'text-slate-400 hover:text-sky-700 hover:bg-sky-50'
                              }`}
                              title={canRevertPreparation(order)
                                ? t('dashboardPages.orders.revertPreparation')
                                : t('dashboardPages.orders.startPreparation')}
                            >
                              {preparingId === order.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Package className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => openFulfillmentModal(order)}
                              disabled={fulfillingId === order.id || !canFulfill(order)}
                              className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-40"
                              title={t('dashboardPages.orders.markShipped')}
                            >
                              {fulfillingId === order.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Truck className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => void markOrderDelivered(order)}
                              disabled={submittingDeliveryProofId === order.id || !canMarkDelivered(order)}
                              className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-40"
                              title={t('dashboardPages.orders.markDelivered')}
                            >
                              {submittingDeliveryProofId === order.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
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

        {/* Quieter Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-5 py-3.5 bg-slate-50/30 dark:bg-slate-800/20">
            <span className="text-xs text-slate-400 font-normal">
              {t('dashboardPages.orders.pageOf', { page, total: totalPages, count: meta.total })}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs"
              >
                ← {t('dashboardPages.orders.previous')}
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs"
              >
                {t('dashboardPages.orders.next')} →
              </button>
            </div>
          </div>
        )}
      </div>

      
      )}

      {/* TAB 2: COD RISK RADAR & PRE-VALIDATION CALL CENTER */}
      {mainTab === 'cod_radar' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* COD Stats Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.codTotalOrders')}</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {orders.filter(o => o.payment_gateway === 'cod').length}
              </p>
              <p className="text-xs text-slate-500 font-normal">{t('dashboardPages.orders.codOnDelivery')}</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">{t('dashboardPages.orders.codAwaitingConfirmation')}</span>
              <p className="text-lg font-bold text-amber-800 dark:text-amber-300">
                {orders.filter(o => o.payment_gateway === 'cod' && (!o.cod_status || o.cod_status === 'pending')).length}
              </p>
              <p className="text-xs text-slate-500 font-normal">{t('dashboardPages.orders.codPhoneCallRequired')}</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">{t('dashboardPages.orders.codConfirmedSecured')}</span>
              <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
                {orders.filter(o => o.payment_gateway === 'cod' && (o.cod_status === 'confirmed' || o.cod_status === 'otp_verified')).length}
              </p>
              <p className="text-xs text-slate-500 font-normal">{t('dashboardPages.orders.codReadyToShip')}</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-rose-700 dark:text-rose-400">{t('dashboardPages.orders.codRejectedFraud')}</span>
              <p className="text-lg font-bold text-rose-800 dark:text-rose-300">
                {orders.filter(o => o.payment_gateway === 'cod' && (o.cod_status === 'rejected' || o.cod_status === 'unreachable')).length}
              </p>
              <p className="text-xs text-slate-500 font-normal">{t('dashboardPages.orders.codStockProtected')}</p>
            </div>
          </div>

          {/* COD Orders Action Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-800/30">
              <div>
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>{t('dashboardPages.orders.codQueueTitle')}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-normal">
                  {t('dashboardPages.orders.codQueueSubtitle')}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-medium uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">{t('dashboardPages.orders.orderNumber')}</th>
                    <th className="px-4 py-3">{t('dashboardPages.orders.customerAndContact')}</th>
                    <th className="px-4 py-3">{t('dashboardPages.orders.codAmount')}</th>
                    <th className="px-4 py-3">{t('dashboardPages.orders.riskScore')}</th>
                    <th className="px-4 py-3">{t('dashboardPages.orders.validationStatus')}</th>
                    <th className="px-4 py-3 text-right">{t('dashboardPages.orders.quickActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {orders.filter(o => o.payment_gateway === 'cod').length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        {t('dashboardPages.orders.codNoOrders')}
                      </td>
                    </tr>
                  ) : (
                    orders.filter(o => o.payment_gateway === 'cod').map((order) => {
                      const phone = order.customer_phone || order.shipping_address?.phone || '';
                      const customerName = `${order.customer_first_name || order.shipping_address?.first_name || ''} ${order.customer_last_name || order.shipping_address?.last_name || ''}`.trim() || 'Client';
                      const cleanPhone = phone.replace(/\D+/g, '');
                      const waPhone = cleanPhone.startsWith('216') ? cleanPhone : `216${cleanPhone}`;
                      const waText = encodeURIComponent(`Bonjour ${customerName}, nous confirmons votre commande PandaMarket #${order.id.slice(-8).toUpperCase()} de montant ${formatMoney(order.store_total || order.total)} pour livraison à ${order.shipping_address?.city || 'votre adresse'}. Confirmez-vous l'envoi ? Merci !`);

                      const riskScore = order.cod_risk_score ?? (order.cod_status === 'otp_verified' || order.cod_status === 'confirmed' ? 0 : 35);
                      const isHighRisk = riskScore > 60;
                      const isModerateRisk = riskScore > 25 && riskScore <= 60;

                      return (
                        <tr key={order.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3.5">
                            <button
                              type="button"
                              onClick={() => { void openOrderDetail(order); }}
                              className="font-semibold text-slate-900 dark:text-white font-mono hover:text-slate-600"
                            >
                              #{order.id.slice(-8).toUpperCase()}
                            </button>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(order.created_at).toLocaleDateString(locale === 'ar' ? 'ar-TN' : 'fr-TN')}
                            </p>
                          </td>

                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-slate-900 dark:text-white">{customerName}</p>
                            <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {phone || <span className="italic text-rose-500">{t('dashboardPages.orders.phoneUnavailable')}</span>}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                              {order.shipping_address?.city}, {order.shipping_address?.address_line_1}
                            </p>
                          </td>

                          <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white font-mono text-xs">
                            {formatMoney(order.store_total || order.total)}
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                isHighRisk
                                  ? 'bg-rose-50 text-rose-800 border-rose-200/60'
                                  : isModerateRisk
                                  ? 'bg-amber-50 text-amber-800 border-amber-200/60'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                              }`}>
                                {isHighRisk ? t('dashboardPages.orders.riskHigh') : isModerateRisk ? t('dashboardPages.orders.riskModerate') : t('dashboardPages.orders.riskLow')} ({riskScore}%)
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                              order.cod_status === 'confirmed' || order.cod_status === 'otp_verified'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                                : order.cod_status === 'rejected' || order.cod_status === 'unreachable'
                                ? 'bg-rose-50 text-rose-800 border-rose-200/60'
                                : 'bg-amber-50 text-amber-800 border-amber-200/60'
                            }`}>
                              {order.cod_status === 'confirmed' ? t('dashboardPages.orders.codConfirmedByCall') :
                               order.cod_status === 'otp_verified' ? t('dashboardPages.orders.codVerifiedByOtp') :
                               order.cod_status === 'unreachable' ? t('dashboardPages.orders.codUnreachable') :
                               order.cod_status === 'rejected' ? t('dashboardPages.orders.codRejected') :
                               t('dashboardPages.orders.codAwaitingCall')}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Direct Phone Call Button */}
                              {phone && (
                                <a
                                  href={`tel:${cleanPhone}`}
                                  onClick={() => handleUpdateCodStatus(order.id, 'pending', 1, 'Tentative d’appel sortant')}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-2xs"
                                  title={t('dashboardPages.orders.callCustomer')}
                                >
                                  <PhoneCall className="w-3.5 h-3.5 text-slate-500" />
                                </a>
                              )}

                              {/* Direct WhatsApp Confirmation Link */}
                              {phone && (
                                <a
                                  href={`https://wa.me/${waPhone}?text=${waText}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
                                  title={t('dashboardPages.orders.sendWhatsAppConfirmation')}
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                </a>
                              )}

                              {/* Confirm Button */}
                              <button
                                type="button"
                                onClick={() => handleUpdateCodStatus(order.id, 'confirmed', 0, 'Confirmé manuellement par le vendeur')}
                                className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-medium text-xs hover:bg-slate-800 transition-colors shadow-2xs flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>{t('dashboardPages.common.confirm')}</span>
                              </button>

                              {/* Reject Button */}
                              <button
                                type="button"
                                onClick={() => handleUpdateCodStatus(order.id, 'rejected', 0, 'Rejeté par le vendeur pour risque élevé')}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shadow-2xs"
                                title={t('dashboardPages.orders.rejectCancel')}
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RTO RETURNS ANALYTICS & REASON CODES */}
      {mainTab === 'rto_returns' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* RTO Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.rtoGlobalRate')}</span>
              <p className="text-lg font-bold text-rose-700 dark:text-rose-400">
                {orders.length > 0
                  ? ((orders.filter(o => Boolean(o.rto_reason_code) || o.status === 'cancelled').length / orders.length) * 100).toFixed(1)
                  : '0.0'}%
              </p>
              <p className="text-xs text-slate-500 font-normal">{t('dashboardPages.orders.rtoTargetBelow5')}</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.rtoReturnedParcels')}</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {orders.filter(o => Boolean(o.rto_reason_code) || o.status === 'cancelled').length}
              </p>
              <p className="text-xs text-slate-500 font-normal">{t('dashboardPages.orders.rtoStockRestored')}</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.rtoSavedValue')}</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                {formatMoney(
                  orders
                    .filter(o => Boolean(o.rto_reason_code) || o.status === 'cancelled')
                    .reduce((acc, o) => acc + (parseFloat(o.store_total || o.total) || 0), 0)
                )}
              </p>
              <p className="text-xs text-slate-500 font-normal">{t('dashboardPages.orders.rtoStockRecovered')}</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.rtoLostShippingCosts')}</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                {formatMoney(
                  orders
                    .filter(o => Boolean(o.rto_reason_code) || o.status === 'cancelled')
                    .reduce((acc, o) => acc + (parseFloat(o.store_shipping_total || o.shipping_total) || 7.000), 0)
                )}
              </p>
              <p className="text-xs text-slate-500 font-normal">{t('dashboardPages.orders.rtoUnrecoverableFees')}</p>
            </div>
          </div>

          {/* RTO Reason Breakdown Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>{t('dashboardPages.orders.rtoJournalTitle')}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-normal">
                {t('dashboardPages.orders.rtoJournalSubtitle')}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-medium uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">{t('dashboardPages.orders.orderNumber')}</th>
                    <th className="px-4 py-3">{t('dashboardPages.orders.customer')}</th>
                    <th className="px-4 py-3">{t('dashboardPages.orders.carrier')}</th>
                    <th className="px-4 py-3">{t('dashboardPages.orders.rtoReason')}</th>
                    <th className="px-4 py-3">{t('dashboardPages.orders.amount')}</th>
                    <th className="px-4 py-3">{t('dashboardPages.orders.rtoDate')}</th>
                    <th className="px-4 py-3 text-right">{t('dashboardPages.orders.details')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {orders.filter(o => Boolean(o.rto_reason_code) || o.status === 'cancelled').length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        {t('dashboardPages.orders.rtoNoReturns')}
                      </td>
                    </tr>
                  ) : (
                    orders.filter(o => Boolean(o.rto_reason_code) || o.status === 'cancelled').map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-slate-900 dark:text-white font-mono">
                            #{order.id.slice(-8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {order.customer_first_name || order.shipping_address?.first_name} {order.customer_last_name || order.shipping_address?.last_name}
                          </p>
                          <p className="text-[10px] text-slate-400">{order.shipping_address?.city}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-medium uppercase text-[11px] text-slate-700 dark:text-slate-300">
                            {order.carrier || 'Aramex'}
                          </span>
                          {order.tracking_number && (
                            <p className="text-[10px] font-mono text-slate-400">{order.tracking_number}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60">
                            {getRtoLabel(order.rto_reason_code)}
                          </span>
                          {order.rto_notes && (
                            <p className="text-[10px] text-slate-500 italic mt-0.5">{order.rto_notes}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white font-mono">
                          {formatMoney(order.store_total || order.total)}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                          {order.rto_at ? new Date(order.rto_at).toLocaleDateString(locale === 'ar' ? 'ar-TN' : 'fr-TN') : new Date(order.created_at).toLocaleDateString(locale === 'ar' ? 'ar-TN' : 'fr-TN')}
                        </td>
                         <td className="px-4 py-3.5 text-right">
                           <button
                             type="button"
                             onClick={() => { void openOrderDetail(order); }}
                             className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-medium transition-colors shadow-2xs"
                           >
                             {t('dashboardPages.orders.viewDetails')}
                           </button>
                         </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COURIER SETTLEMENT LEDGER */}
      {mainTab === 'courier_settlements' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Settlement KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.settlementTotalCollected')}</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                {formatMoney(settlementsSummary.total_collected)}
              </p>
              <p className="text-xs text-slate-500 font-normal">{t('dashboardPages.orders.settlementGrossFromCustomers')}</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.settlementFeesDeducted')}</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                -{formatMoney(settlementsSummary.total_courier_fees)}
              </p>
              <p className="text-xs text-slate-500 font-normal">{t('dashboardPages.orders.settlementCarrierBilling')}</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">{t('dashboardPages.orders.settlementAwaitingTransfer')}</span>
              <p className="text-lg font-bold text-amber-800 dark:text-amber-300 font-mono">
                {formatMoney(settlementsSummary.pending_payout)}
              </p>
              <p className="text-xs text-slate-500 font-normal">{t('dashboardPages.orders.settlementPendingCount', { count: settlementsSummary.pending_count })}</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">{t('dashboardPages.orders.settlementNetToVendor')}</span>
              <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300 font-mono">
                {formatMoney(settlementsSummary.settled_payout)}
              </p>
              <p className="text-xs text-slate-500 font-normal">{t('dashboardPages.orders.settlementSettledCount', { count: settlementsSummary.settled_count })}</p>
            </div>
          </div>

          {/* Settlements Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-800/30">
              <div>
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  <span>{t('dashboardPages.orders.settlementLedgerTitle')}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-normal">
                  {t('dashboardPages.orders.settlementLedgerSubtitle')}
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={settlementCarrierFilter}
                  onChange={(e) => setSettlementCarrierFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-normal text-slate-700 dark:text-slate-300 outline-none shadow-2xs"
                >
                  <option value="all">{t('dashboardPages.orders.allCarriers')}</option>
                  <option value="aramex">Aramex</option>
                  <option value="laposte">La Poste Tunisienne</option>
                  <option value="first_delivery">First Delivery</option>
                  <option value="livri">Livri</option>
                  <option value="own_fleet">{t('dashboardPages.orders.ownFleet')}</option>
                </select>

                <select
                  value={settlementStatusFilter}
                  onChange={(e) => setSettlementStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-normal text-slate-700 dark:text-slate-300 outline-none shadow-2xs"
                >
                  <option value="all">{t('dashboardPages.orders.allStatuses')}</option>
                  <option value="pending">{t('dashboardPages.orders.settlementAwaitingTransfer')}</option>
                  <option value="settled">{t('dashboardPages.orders.settlementStatusSettled')}</option>
                  <option value="disputed">{t('dashboardPages.orders.settlementStatusDisputed')}</option>
                </select>

                <button
                  type="button"
                  onClick={exportSettlementsCsv}
                  disabled={settlements.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-normal text-slate-700 dark:text-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Exporter CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-medium uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">{t('dashboardPages.orders.orderNumber')}</th>
                    <th className="px-4 py-3">{t('dashboardPages.orders.carrier')}</th>
                    <th className="px-4 py-3">{t('dashboardPages.orders.settlementCollectedFromCustomer')}</th>
                    <th className="px-4 py-3">Frais Livraison</th>
                    <th className="px-4 py-3">{t('dashboardPages.orders.settlementNetToPay')}</th>
                    <th className="px-4 py-3">{t('dashboardPages.orders.settlementStatusHeader')}</th>
                    <th className="px-4 py-3 text-right">Rapprochement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {settlements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        {settlementsLoading ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                            <span>{t('dashboardPages.orders.settlementLoading')}</span>
                          </div>
                        ) : (
                          <span>{t('dashboardPages.orders.settlementEmpty')}</span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    settlements.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-slate-900 dark:text-white font-mono">
                            #{st.order_id.slice(-8).toUpperCase()}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">{st.customer_name || 'Client'}</p>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-medium uppercase text-[11px] text-slate-800 dark:text-slate-200">
                            {st.carrier}
                          </span>
                          {st.tracking_number && (
                            <p className="text-[10px] font-mono text-slate-400">{st.tracking_number}</p>
                          )}
                        </td>

                        <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white font-mono">
                          {formatMoney(st.collected_amount)}
                        </td>

                        <td className="px-4 py-3.5 font-semibold text-slate-600 dark:text-slate-400 font-mono">
                          -{formatMoney(st.courier_fee)}
                        </td>

                        <td className="px-4 py-3.5 font-semibold text-emerald-700 dark:text-emerald-400 font-mono text-xs">
                          +{formatMoney(st.net_payout)}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            st.status === 'settled'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                              : st.status === 'disputed'
                              ? 'bg-rose-50 text-rose-800 border-rose-200/60'
                              : 'bg-amber-50 text-amber-800 border-amber-200/60'
                          }`}>
                            {st.status === 'settled' ? t('dashboardPages.orders.settlementStatusSettled') : st.status === 'disputed' ? t('dashboardPages.orders.settlementStatusDisputed') : t('dashboardPages.orders.settlementStatusPending')}
                          </span>
                          {st.settlement_reference && (
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">{t('dashboardPages.orders.settlementRef')} {st.settlement_reference}</p>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const matchOrder = orders.find(o => o.id === st.order_id);
                              if (matchOrder) {
                                setReconcileOrderTarget(matchOrder);
                                setReconcileCarrier(st.carrier);
                                setReconcileCollectedAmount(String(st.collected_amount));
                                setReconcileCourierFee(String(st.courier_fee));
                                setReconcileRef(st.settlement_reference || '');
                                setReconcileStatus(st.status);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium text-xs hover:bg-slate-800 transition-colors shadow-2xs"
                          >
                            {t('dashboardPages.orders.settlementReconcile')}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <SellerOrderDrawer
          order={selectedOrder}
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          onOrderUpdated={async () => {
            await openOrderDetail(selectedOrder);
            await fetchOrders();
          }}
          marketplaceName={marketplaceName}
          locale={locale}
          t={t}
          formatMoney={formatMoney}
          formatDateTime={formatDateTime}
          statusLabel={statusLabel}
          paymentStatusLabel={paymentStatusLabel}
          paymentStatusColor={paymentStatusColor}
          fulfillmentLabel={fulfillmentLabel}
          fulfillmentColor={fulfillmentColor}
          storeOrderStatus={storeOrderStatus}
          buildOrderTimeline={buildOrderTimeline}
          canGenerateShippingLabel={canGenerateShippingLabel}
          canPrepare={canPrepare}
          canRevertPreparation={canRevertPreparation}
          canFulfill={canFulfill}
          canMarkDelivered={canMarkDelivered}
          canRequestRefund={canRequestRefund}
          refundableRemaining={refundableRemaining}
          refundRequestedTotal={refundRequestedTotal}
          refundStatusColor={refundStatusColor}
          refundStatusLabel={refundStatusLabel}
          refundReasonLabel={refundReasonLabel}
          latestShipment={latestShipment}
          generateShippingLabel={generateShippingLabel}
          startPreparation={startPreparation}
          revertPreparation={revertPreparation}
          openFulfillmentModal={openFulfillmentModal}
          markOrderDelivered={markOrderDelivered}
          openRefundModal={openRefundModal}
          startBuyerChat={startBuyerChat}
          printSelectedOrder={printSelectedOrder}
          setRtoOrderTarget={setRtoOrderTarget}
          getTrackingUrl={getTrackingUrl}
          generatingLabelId={generatingLabelId}
          preparingId={preparingId}
          submittingDeliveryProofId={submittingDeliveryProofId}
          startingChatId={startingChatId}
        />
      )}

      {refundOrderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-100 dark:border-slate-800">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('dashboardPages.orders.refundRequestTitle')}</h2>
                <p className="mt-1 inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">#{refundOrderTarget.id.slice(-8).toUpperCase()}</p>
              </div>
              <button
                type="button"
                onClick={() => setRefundOrderTarget(null)}
                disabled={refundingOrderId === refundOrderTarget.id}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid gap-3 rounded-xl border border-rose-200/60 bg-rose-50/60 dark:bg-rose-950/40 p-3.5 text-xs sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-rose-700 dark:text-rose-400">{t('dashboardPages.orders.storeTotal')}</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-white font-mono">{formatMoney(refundOrderTarget.store_total ?? refundOrderTarget.total, refundOrderTarget.currency || 'TND')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-rose-700 dark:text-rose-400">{t('dashboardPages.orders.refundableRemaining')}</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-white font-mono">{formatMoney(refundableRemaining(refundOrderTarget), refundOrderTarget.currency || 'TND')}</p>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.amount')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  max={refundableRemaining(refundOrderTarget)}
                  value={refundAmount}
                  onChange={(event) => setRefundAmount(event.target.value)}
                  disabled={refundingOrderId === refundOrderTarget.id}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-normal text-slate-900 dark:text-white outline-none transition focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 disabled:opacity-50 shadow-2xs"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.reason')}</label>
                <select
                  value={refundReasonCode}
                  onChange={(event) => setRefundReasonCode(event.target.value)}
                  disabled={refundingOrderId === refundOrderTarget.id}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-normal text-slate-700 dark:text-slate-200 outline-none transition focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 disabled:opacity-50 shadow-2xs"
                >
                  {REFUND_REASON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.internalNote')}</label>
                <textarea
                  value={refundReason}
                  onChange={(event) => setRefundReason(event.target.value)}
                  disabled={refundingOrderId === refundOrderTarget.id}
                  rows={3}
                  maxLength={1000}
                  placeholder={t('dashboardPages.orders.refundNotePlaceholder')}
                  className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-normal text-slate-900 dark:text-white outline-none transition focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 disabled:opacity-50 shadow-2xs"
                />
              </div>
              <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 dark:bg-amber-950/30 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-300 font-normal">
                {t('dashboardPages.orders.refundDisclaimer')}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setRefundOrderTarget(null)}
                  disabled={refundingOrderId === refundOrderTarget.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 disabled:opacity-50 shadow-2xs"
                >
                  {t('dashboardPages.common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => void submitRefundRequest()}
                  disabled={refundingOrderId === refundOrderTarget.id}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-xs font-medium text-white dark:text-slate-900 transition hover:bg-slate-800 disabled:opacity-60 shadow-2xs"
                >
                  {refundingOrderId === refundOrderTarget.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                  {t('dashboardPages.orders.saveRequest')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deliveryProofTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-100 dark:border-slate-800">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('dashboardPages.orders.deliveryProofTitle')}</h2>
                <p className="mt-1 inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">#{deliveryProofTarget.id.slice(-8).toUpperCase()}</p>
              </div>
              <button
                type="button"
                onClick={() => setDeliveryProofTarget(null)}
                disabled={submittingDeliveryProofId === deliveryProofTarget.id}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 dark:bg-amber-950/30 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-300 font-normal">
                {t('dashboardPages.orders.deliveryProofDesc')}
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.receivedBy')}</label>
                <input
                  value={deliveryProofReceivedBy}
                  onChange={(event) => setDeliveryProofReceivedBy(event.target.value)}
                  disabled={submittingDeliveryProofId === deliveryProofTarget.id}
                  placeholder={t('dashboardPages.orders.receivedByPlaceholder')}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-normal text-slate-900 dark:text-white outline-none transition focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 disabled:opacity-50 shadow-2xs"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.proofFile')}</label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-4 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-slate-400 transition-colors">
                  <Upload className="h-4 w-4 text-slate-400" />
                  {deliveryProofFile ? deliveryProofFile.name : t('dashboardPages.orders.chooseImageOrPdf')}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(event) => setDeliveryProofFile(event.target.files?.[0] || null)}
                    disabled={submittingDeliveryProofId === deliveryProofTarget.id}
                    className="hidden"
                  />
                </label>
                <p className="mt-1 text-[10px] text-slate-400 font-normal">{t('dashboardPages.orders.proofFileHint')}</p>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.deliveryNote')}</label>
                <textarea
                  value={deliveryProofNote}
                  onChange={(event) => setDeliveryProofNote(event.target.value)}
                  disabled={submittingDeliveryProofId === deliveryProofTarget.id}
                  rows={3}
                  maxLength={1000}
                  placeholder={t('dashboardPages.orders.deliveryNotePlaceholder')}
                  className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-normal text-slate-900 dark:text-white outline-none transition focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 disabled:opacity-50 shadow-2xs"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setDeliveryProofTarget(null)}
                  disabled={submittingDeliveryProofId === deliveryProofTarget.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 disabled:opacity-50 shadow-2xs"
                >
                  {t('dashboardPages.common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => void submitDeliveryProof()}
                  disabled={submittingDeliveryProofId === deliveryProofTarget.id}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-xs font-medium text-white dark:text-slate-900 transition hover:bg-slate-800 disabled:opacity-60 shadow-2xs"
                >
                  {submittingDeliveryProofId === deliveryProofTarget.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {t('dashboardPages.orders.confirmDelivery')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {bulkFulfillmentTargets.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-5">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('dashboardPages.orders.bulkFulfillmentTitle')}</h2>
                <p className="mt-0.5 text-xs text-slate-500 font-normal">
                  {t('dashboardPages.orders.bulkFulfillmentReady', { count: bulkFulfillmentTargets.length })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBulkFulfillmentTargets([]);
                  setBulkFulfillmentDrafts({});
                }}
                disabled={bulkFulfilling}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="max-h-[calc(90vh-180px)] overflow-y-auto p-5 space-y-4">
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3.5">
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-500">{t('dashboardPages.orders.applyCarrierToAll')}</label>
                <select
                  onChange={(event) => applyCarrierToBulkFulfillment(event.target.value)}
                  defaultValue=""
                  disabled={bulkFulfilling}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-normal text-slate-800 dark:text-slate-200 outline-none transition focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 disabled:opacity-50 shadow-2xs"
                >
                  <option value="">{t('dashboardPages.orders.select')}</option>
                  {CARRIER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                  <option value="Autre">{t('dashboardPages.orders.otherManual')}</option>
                </select>
              </div>
              <div className="space-y-3">
                {bulkFulfillmentTargets.map((order) => {
                  const draft = bulkFulfillmentDrafts[order.id] || { carrier: '', trackingNumber: '' };
                  return (
                    <div key={order.id} className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">#{order.id.slice(-8).toUpperCase()}</p>
                          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{customerName(order, t)}</p>
                        </div>
                        <span className="text-xs font-semibold text-slate-900 dark:text-white font-mono">{formatMoney(order.store_total ?? order.total, order.currency || 'TND')}</span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.carrier')}</label>
                          <select
                            value={draft.carrier}
                            onChange={(event) => updateBulkFulfillmentDraft(order.id, 'carrier', event.target.value)}
                            disabled={bulkFulfilling}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-normal text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400 disabled:opacity-50"
                          >
                            <option value="">{t('dashboardPages.orders.select')}</option>
                            {CARRIER_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                            <option value="Autre">{t('dashboardPages.orders.otherManual')}</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.trackingNumber')}</label>
                          <input
                            value={draft.trackingNumber}
                            onChange={(event) => updateBulkFulfillmentDraft(order.id, 'trackingNumber', event.target.value)}
                            disabled={bulkFulfilling}
                            placeholder={t('dashboardPages.orders.trackingNumberPlaceholder')}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-normal text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400 disabled:opacity-50"
                          />
                          {getTrackingUrl(draft.carrier, draft.trackingNumber) && (
                            <a
                              href={getTrackingUrl(draft.carrier, draft.trackingNumber)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900"
                            >
                              {t('dashboardPages.orders.preview')}
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setBulkFulfillmentTargets([]);
                  setBulkFulfillmentDrafts({});
                }}
                disabled={bulkFulfilling}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 disabled:opacity-50 shadow-2xs"
              >
                {t('dashboardPages.common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void submitBulkFulfillment()}
                disabled={bulkFulfilling}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-xs font-medium text-white dark:text-slate-900 transition hover:bg-slate-800 disabled:opacity-60 shadow-2xs"
              >
                {bulkFulfilling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
                {t('dashboardPages.orders.confirmShipments', { count: bulkFulfillmentTargets.length })}
              </button>
            </div>
          </div>
        </div>
      )}

      {fulfillOrderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-100 dark:border-slate-800">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('dashboardPages.orders.markAsShipped')}</h2>
                <p className="mt-1 inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">#{fulfillOrderTarget.id.slice(-8).toUpperCase()}</p>
              </div>
              <button
                type="button"
                onClick={() => setFulfillOrderTarget(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.carrier')}</label>
                <select
                  value={carrier}
                  onChange={(event) => setCarrier(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-normal text-slate-700 dark:text-slate-200 outline-none transition focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-2xs"
                >
                  <option value="">{t('dashboardPages.orders.selectCarrier')}</option>
                  {CARRIER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                  <option value="Autre">{t('dashboardPages.orders.otherManual')}</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.trackingNumber')}</label>
                <input
                  value={trackingNumber}
                  onChange={(event) => setTrackingNumber(event.target.value)}
                  placeholder={t('dashboardPages.orders.trackingNumberPlaceholder')}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-normal text-slate-900 dark:text-white outline-none transition focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-2xs"
                />
                {getTrackingUrl(carrier, trackingNumber) && (
                  <a
                    href={getTrackingUrl(carrier, trackingNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900"
                  >
                    {t('dashboardPages.orders.previewTrackingLink')}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
              <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 dark:bg-amber-950/30 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-300 font-normal">
                {t('dashboardPages.orders.fulfillDisclaimer')}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setFulfillOrderTarget(null)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 shadow-2xs"
                >
                  {t('dashboardPages.common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => void fulfillOrder()}
                  disabled={fulfillingId === fulfillOrderTarget.id}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-xs font-medium text-white dark:text-slate-900 transition hover:bg-slate-800 disabled:opacity-60 shadow-2xs"
                >
                  {fulfillingId === fulfillOrderTarget.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
                  {t('dashboardPages.orders.confirmShipment')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reconcileOrderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-100 dark:border-slate-800">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Rapprochement Règlement Transporteur</h2>
                <p className="mt-1 inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                  #{reconcileOrderTarget.id.slice(-8).toUpperCase()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReconcileOrderTarget(null)}
                disabled={savingSettlement}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.carrier')}</label>
                  <select
                    value={reconcileCarrier}
                    onChange={(e) => setReconcileCarrier(e.target.value)}
                    disabled={savingSettlement}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-normal text-slate-700 dark:text-slate-200 outline-none transition focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-2xs"
                  >
                    <option value="aramex">Aramex</option>
                    <option value="laposte">La Poste Tunisienne</option>
                    <option value="first_delivery">First Delivery</option>
                    <option value="livri">Livri</option>
                    <option value="own_fleet">{t('dashboardPages.orders.ownFleet')}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.settlementStatusHeader')}</label>
                  <select
                    value={reconcileStatus}
                    onChange={(e) => setReconcileStatus(e.target.value as 'pending' | 'settled' | 'disputed')}
                    disabled={savingSettlement}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-normal text-slate-700 dark:text-slate-200 outline-none transition focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-2xs"
                  >
                    <option value="pending">{t('dashboardPages.orders.settlementAwaitingTransfer')}</option>
                    <option value="settled">{t('dashboardPages.orders.settlementStatusSettled')}</option>
                    <option value="disputed">{t('dashboardPages.orders.settlementStatusDisputed')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-3.5 text-xs">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.settlementCollectedFromCustomer')}</span>
                  <input
                    type="number"
                    step="0.001"
                    value={reconcileCollectedAmount}
                    onChange={(e) => setReconcileCollectedAmount(e.target.value)}
                    disabled={savingSettlement}
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-mono font-semibold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Frais Colis</span>
                  <input
                    type="number"
                    step="0.001"
                    value={reconcileCourierFee}
                    onChange={(e) => setReconcileCourierFee(e.target.value)}
                    disabled={savingSettlement}
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-mono font-semibold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">{t('dashboardPages.orders.settlementNetToVendor')}</span>
                  <p className="mt-2 text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
                    +{formatMoney((parseFloat(reconcileCollectedAmount) || 0) - (parseFloat(reconcileCourierFee) || 0))}
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-400">Référence Virement / Bordereau</label>
                <input
                  value={reconcileRef}
                  onChange={(e) => setReconcileRef(e.target.value)}
                  disabled={savingSettlement}
                  placeholder="Ex: VIR-ARAMEX-2026-08"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-normal text-slate-900 dark:text-white outline-none transition focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-2xs"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-400">Note interne</label>
                <textarea
                  value={reconcileNotes}
                  onChange={(e) => setReconcileNotes(e.target.value)}
                  disabled={savingSettlement}
                  rows={2}
                  placeholder="Notes ou détails sur l'écart de rapprochement..."
                  className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-normal text-slate-900 dark:text-white outline-none transition focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-2xs"
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setReconcileOrderTarget(null)}
                  disabled={savingSettlement}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 shadow-2xs"
                >
                  {t('dashboardPages.common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveCourierSettlement()}
                  disabled={savingSettlement}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-xs font-medium text-white dark:text-slate-900 transition hover:bg-slate-800 disabled:opacity-60 shadow-2xs"
                >
                  {savingSettlement ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DollarSign className="h-3.5 w-3.5" />}
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
