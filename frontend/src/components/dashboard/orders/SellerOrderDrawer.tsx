'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  ReceiptText,
  FileText,
  Layers,
  ShoppingBag,
  Truck,
  ShieldAlert,
  StickyNote,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Check,
  Mail,
  Phone,
  MapPin,
  Plus,
  Minus,
  Trash2,
  PhoneCall,
  MessageSquare,
  Save,
  CreditCard,
  RotateCcw,
  DollarSign,
  Ban,
  Package,
  Search,
  ExternalLink,
} from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';
import { getResizedImageUrl } from '@/lib/image-url';
import type {
  Order,
  OrderItem,
  SellerOrderNote,
  SellerOrderRefund,
  SellerOrderShipment,
  SellerDeliveryProof,
  ShippingAddress,
} from '@/app/hub/dashboard/orders/page';

export type {
  Order,
  OrderItem,
  SellerOrderNote,
  SellerOrderRefund,
  SellerOrderShipment,
  SellerDeliveryProof,
  ShippingAddress,
};

interface SellerOrderDrawerProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: () => Promise<void> | void;
  marketplaceName: string;
  locale: string;
  t: (key: string, params?: any) => string;
  formatMoney: (amount: string | number | null | undefined, currency?: string) => string;
  formatDateTime: (dateStr: string | null | undefined, locale: string) => string;
  statusLabel: (status: string, t: any) => string;
  paymentStatusLabel: (status: string, t: any) => string;
  paymentStatusColor: (status: string) => string;
  fulfillmentLabel: (status: string | null | undefined, t: any) => string;
  fulfillmentColor: (status: string | null | undefined) => string;
  storeOrderStatus: (order: Order, t: any) => { label: string; color: string };
  buildOrderTimeline: (order: Order, t: any) => Array<{ label: string; description: string; state: 'done' | 'current' | 'failed' | 'pending'; date?: string | null }>;
  canGenerateShippingLabel: (order: Order) => boolean;
  canPrepare: (order: Order) => boolean;
  canRevertPreparation: (order: Order) => boolean;
  canFulfill: (order: Order) => boolean;
  canMarkDelivered: (order: Order) => boolean;
  canRequestRefund: (order: Order) => boolean;
  refundableRemaining: (order: Order) => number;
  refundRequestedTotal: (order: Order) => number;
  refundStatusColor: (status: string) => string;
  refundStatusLabel: (status: string, t: any) => string;
  refundReasonLabel: (code: string, t: any) => string;
  latestShipment: (order: Order) => SellerOrderShipment | null;
  generateShippingLabel: (order: Order) => Promise<void>;
  startPreparation: (order: Order) => Promise<void>;
  revertPreparation: (order: Order) => Promise<void>;
  openFulfillmentModal: (order: Order) => void;
  markOrderDelivered: (order: Order) => Promise<void>;
  openRefundModal: (order: Order) => void;
  startBuyerChat: (order: Order) => Promise<void>;
  printSelectedOrder: (kind: 'invoice' | 'delivery_slip') => void;
  setRtoOrderTarget?: (order: Order) => void;
  getTrackingUrl: (carrier?: string | null, trackingNumber?: string | null) => string | null;
  generatingLabelId?: string;
  preparingId?: string;
  submittingDeliveryProofId?: string;
  startingChatId?: string;
}

export function SellerOrderDrawer({
  order,
  isOpen,
  onClose,
  onOrderUpdated,
  marketplaceName,
  locale,
  t,
  formatMoney,
  formatDateTime,
  statusLabel,
  paymentStatusLabel,
  paymentStatusColor,
  fulfillmentLabel,
  fulfillmentColor,
  storeOrderStatus,
  buildOrderTimeline,
  canGenerateShippingLabel,
  canPrepare,
  canRevertPreparation,
  canFulfill,
  canMarkDelivered,
  canRequestRefund,
  refundableRemaining,
  refundRequestedTotal,
  refundStatusColor,
  refundStatusLabel,
  refundReasonLabel,
  latestShipment,
  generateShippingLabel,
  startPreparation,
  revertPreparation,
  openFulfillmentModal,
  markOrderDelivered,
  openRefundModal,
  startBuyerChat,
  printSelectedOrder,
  setRtoOrderTarget,
  getTrackingUrl,
  generatingLabelId,
  preparingId,
  submittingDeliveryProofId,
  startingChatId,
}: SellerOrderDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'shipping' | 'cod' | 'notes'>('overview');
  const [sellerNote, setSellerNote] = useState(order.seller_note?.body || '');
  const [savingNote, setSavingNote] = useState(false);
  const [noteFeedback, setNoteFeedback] = useState('');

  // Editing Engine State
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [availableStoreProducts, setAvailableStoreProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<any | null>(null);
  const [selectedVariantToAdd, setSelectedVariantToAdd] = useState<any | null>(null);
  const [addItemQuantity, setAddItemQuantity] = useState(1);
  const [addingItemLoading, setAddingItemLoading] = useState(false);
  const [orderEditFeedback, setOrderEditFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // COD State
  const [codOtpInput, setCodOtpInput] = useState('');
  const [sendingCodOtp, setSendingCodOtp] = useState(false);
  const [verifyingCodOtp, setVerifyingCodOtp] = useState(false);
  const [updatingCodStatus, setUpdatingCodStatus] = useState(false);
  const [codFeedback, setCodFeedback] = useState('');

  useEffect(() => {
    setSellerNote(order.seller_note?.body || '');
    setNoteFeedback('');
    setOrderEditFeedback(null);
  }, [order]);

  if (!isOpen) return null;

  const toNumber = (val: any) => {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  };

  const customerName = () => {
    const n = `${order.customer_first_name || order.shipping_address?.first_name || ''} ${order.customer_last_name || order.shipping_address?.last_name || ''}`.trim();
    return n || t('dashboardPages.orders.customer');
  };

  const isEditable = (order.fulfillment_status === 'pending' || order.fulfillment_status === 'preparing' || !order.fulfillment_status) && order.status !== 'cancelled' && order.status !== 'refunded';

  const saveSellerNote = async () => {
    setSavingNote(true);
    setNoteFeedback('');
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/store/${order.id}/note`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: sellerNote }),
      });
      if (res.ok) {
        setNoteFeedback(t('dashboardPages.orders.noteSaved'));
        await onOrderUpdated();
      } else {
        setNoteFeedback('Erreur lors de l’enregistrement de la note.');
      }
    } catch {
      setNoteFeedback('Erreur réseau lors de l’enregistrement.');
    } finally {
      setSavingNote(false);
    }
  };

  const fetchStoreProductsForPicker = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetchWithCsrf('/api/pd/products/me?status=published&limit=100');
      const data = await res.json();
      if (res.ok) {
        setAvailableStoreProducts(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load store products for picker', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleUpdateItemQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setEditingItemId(itemId);
    setOrderEditFeedback(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/store/${order.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Erreur lors de la mise à jour de la quantité');
      }
      setOrderEditFeedback({ type: 'success', message: 'Quantité mise à jour avec succès.' });
      await onOrderUpdated();
    } catch (err) {
      setOrderEditFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Erreur inconnue' });
    } finally {
      setEditingItemId(null);
    }
  };

  const handleRemoveOrderItem = async (itemId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer cet article de la commande ?')) return;
    setEditingItemId(itemId);
    setOrderEditFeedback(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/store/${order.id}/items/${itemId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Erreur lors de la suppression de l’article');
      }
      setOrderEditFeedback({ type: 'success', message: 'Article retiré avec succès.' });
      await onOrderUpdated();
    } catch (err) {
      setOrderEditFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Erreur inconnue' });
    } finally {
      setEditingItemId(null);
    }
  };

  const handleAddOrderItem = async () => {
    if (!selectedProductToAdd) return;
    setAddingItemLoading(true);
    setOrderEditFeedback(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/store/${order.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProductToAdd.id,
          variant_id: selectedVariantToAdd?.id || undefined,
          quantity: addItemQuantity,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Erreur lors de l’ajout du produit');
      }
      setOrderEditFeedback({ type: 'success', message: 'Article ajouté à la commande avec succès.' });
      setShowAddProductModal(false);
      setSelectedProductToAdd(null);
      setSelectedVariantToAdd(null);
      setAddItemQuantity(1);
      await onOrderUpdated();
    } catch (err) {
      setOrderEditFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Erreur inconnue' });
    } finally {
      setAddingItemLoading(false);
    }
  };

  const handleSendCodOtp = async () => {
    setSendingCodOtp(true);
    setCodFeedback('');
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/store/${order.id}/cod-otp/send`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setCodFeedback('Code OTP envoyé au client avec succès.');
      } else {
        setCodFeedback(data.error?.message || 'Échec de l’envoi OTP.');
      }
    } catch {
      setCodFeedback('Erreur de communication.');
    } finally {
      setSendingCodOtp(false);
    }
  };

  const handleVerifyCodOtp = async () => {
    if (!codOtpInput.trim()) return;
    setVerifyingCodOtp(true);
    setCodFeedback('');
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/store/${order.id}/cod-otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codOtpInput.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setCodFeedback('OTP validé avec succès ! Commande certifiée.');
        setCodOtpInput('');
        await onOrderUpdated();
      } else {
        setCodFeedback(data.error?.message || 'Code OTP invalide.');
      }
    } catch {
      setCodFeedback('Erreur de vérification.');
    } finally {
      setVerifyingCodOtp(false);
    }
  };

  const handleUpdateCodStatus = async (status: string, callAttemptsDelta: number, note: string) => {
    setUpdatingCodStatus(true);
    try {
      const res = await fetchWithCsrf(`/api/pd/orders/store/${order.id}/cod-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, call_attempts_delta: callAttemptsDelta, notes: note }),
      });
      if (res.ok) {
        await onOrderUpdated();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingCodStatus(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
        <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col border border-slate-100">
          {/* Header */}
          <div className="border-b border-slate-100 bg-white px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base font-semibold text-slate-900">{t('dashboardPages.orders.orderDetails')}</h2>
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-800">
                  #{order.id.slice(-8).toUpperCase()}
                </span>
                {order.fulfillment_status && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${fulfillmentColor(order.fulfillment_status)}`}>
                    {fulfillmentLabel(order.fulfillment_status, t)}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500 font-normal">
                {t('dashboardPages.orders.createdOn', { date: formatDateTime(order.created_at, locale) })}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`/api/pd/orders/store/${order.id}/invoice.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                title="Télécharger la Facture Vendeur PDF"
              >
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                Facture PDF
              </a>
              <button
                type="button"
                onClick={() => printSelectedOrder('delivery_slip')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
              >
                <ReceiptText className="h-3.5 w-3.5 text-slate-500" />
                {t('dashboardPages.orders.deliverySlip')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* 5-Tab Navigation Bar */}
          <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 overflow-x-auto gap-1.5 py-2">
            {[
              { id: 'overview', label: 'Vue d\'ensemble', icon: <Layers className="w-3.5 h-3.5" /> },
              { id: 'items', label: `Articles (${order.items?.length || 0})`, icon: <ShoppingBag className="w-3.5 h-3.5" /> },
              { id: 'shipping', label: 'Expédition & Transport', icon: <Truck className="w-3.5 h-3.5" /> },
              ...(order.payment_gateway === 'cod' ? [{ id: 'cod', label: 'Radar COD & Diagnostic', icon: <ShieldAlert className="w-3.5 h-3.5" /> }] : []),
              { id: 'notes', label: 'Facture & Notes', icon: <StickyNote className="w-3.5 h-3.5" /> },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-slate-900 text-white font-medium shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-normal'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 max-h-[calc(92vh-130px)]">
            <div className="space-y-6">
              {/* Feedback Banner */}
              {orderEditFeedback && (
                <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-bold ${
                  orderEditFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {orderEditFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                    <span>{orderEditFeedback.message}</span>
                  </div>
                  <button onClick={() => setOrderEditFeedback(null)} className="text-xs opacity-70 hover:opacity-100">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  TAB 1: VUE D'ENSEMBLE (OVERVIEW)
                 ───────────────────────────────────────────────────────────── */}
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
                      <p className="text-xs font-black uppercase tracking-wide text-gray-400">{t('dashboardPages.orders.status')}</p>
                      {(() => {
                        const store = storeOrderStatus(order, t);
                        return (
                          <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${store.color}`}>
                            {store.label}
                          </span>
                        );
                      })()}
                      <p className="mt-2 text-[10px] font-bold text-gray-400">
                        {t('dashboardPages.orders.marketplaceStatus')}: {statusLabel(order.status, t)}
                      </p>
                      {toNumber(order.other_pending_stores) > 0 && (
                        <p className="mt-1 text-[10px] font-bold text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200/60">
                          {t('dashboardPages.orders.waitingOtherStores', { count: toNumber(order.other_pending_stores) })}
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
                      <p className="text-xs font-black uppercase tracking-wide text-gray-400">{t('dashboardPages.orders.paymentStatus')}</p>
                      <span className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${paymentStatusColor(order.payment_status)}`}>
                        {paymentStatusLabel(order.payment_status, t)}
                      </span>
                      <p className="mt-2 text-xs font-bold text-gray-600 capitalize">
                        Mode : {order.payment_gateway?.replace('_', ' ') || '—'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
                      <p className="text-xs font-black uppercase tracking-wide text-gray-400">{t('dashboardPages.orders.fulfillment')}</p>
                      <span className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${fulfillmentColor(order.fulfillment_status)}`}>
                        {fulfillmentLabel(order.fulfillment_status, t)}
                      </span>
                      <p className="mt-2 text-xs font-bold text-gray-600">
                        {order.carrier ? `Transporteur : ${order.carrier}` : 'Non assigné'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
                      <p className="text-xs font-black uppercase tracking-wide text-gray-400">{t('dashboardPages.orders.yourTotal')}</p>
                      <p className="mt-2 text-lg font-black text-gray-900">{formatMoney(order.store_total ?? order.total, order.currency || 'TND')}</p>
                      <p className="mt-1 text-[11px] font-semibold text-gray-500">
                        Dont livraison : {formatMoney(order.store_shipping_total ?? order.shipping_total, order.currency || 'TND')}
                      </p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <h3 className="text-sm font-black text-gray-900">{t('dashboardPages.orders.orderTimeline')}</h3>
                      <span className="rounded-full bg-gray-50 px-3 py-1 text-xs font-bold text-gray-500">
                        {t('dashboardPages.orders.timelineProgress', { done: buildOrderTimeline(order, t).filter((step) => step.state === 'done').length, total: buildOrderTimeline(order, t).length })}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {buildOrderTimeline(order, t).map((step, index, steps) => (
                        <div key={`${step.label}-${index}`} className="relative flex gap-3">
                          {index < steps.length - 1 && <div className="absolute left-[16px] top-7 h-full w-px bg-gray-100" />}
                          <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                            step.state === 'done'
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : step.state === 'current'
                              ? 'border-amber-500 bg-amber-50 text-amber-700 ring-4 ring-amber-100'
                              : 'border-gray-200 bg-gray-50 text-gray-400'
                          }`}>
                            {step.state === 'done' ? <Check className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1 pb-3">
                            <p className="text-xs font-black text-gray-900">{step.label}</p>
                            <p className="text-[11px] font-semibold text-gray-500">{step.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Customer & Address grid */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
                      <div className="flex items-center gap-2 mb-3">
                        <Mail className="h-4 w-4 text-[#B91C1C]" />
                        <h3 className="text-sm font-black text-gray-900">{t('dashboardPages.orders.customer')}</h3>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="font-extrabold text-gray-900">{customerName()}</p>
                        <p className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          {order.customer_email || t('dashboardPages.orders.emailUnavailable')}
                        </p>
                        <p className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          {order.customer_phone || t('dashboardPages.orders.phoneUnavailable')}
                        </p>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <div className="rounded-xl bg-gray-50 p-2.5">
                            <p className="text-[10px] font-black uppercase text-gray-400">{t('dashboardPages.orders.orders')}</p>
                            <p className="mt-1 text-sm font-black text-gray-900">{toNumber(order.customer_order_count)}</p>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-2.5">
                            <p className="text-[10px] font-black uppercase text-gray-400">LTV</p>
                            <p className="mt-1 text-sm font-black text-gray-900">{formatMoney(order.customer_lifetime_value ?? 0, order.currency || 'TND')}</p>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-2.5">
                            <p className="text-[10px] font-black uppercase text-gray-400">{t('dashboardPages.orders.lastOrder')}</p>
                            <p className="mt-1 text-xs font-black text-gray-900">{formatDateTime(order.customer_last_order_at, locale)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-4 w-4 text-[#B91C1C]" />
                        <h3 className="text-sm font-black text-gray-900">{t('dashboardPages.orders.deliveryAddress')}</h3>
                      </div>
                      {order.shipping_address ? (
                        <div className="space-y-1 text-xs font-semibold text-gray-600">
                          <p className="font-bold text-gray-900 text-sm">
                            {[order.shipping_address.first_name, order.shipping_address.last_name].filter(Boolean).join(' ')}
                          </p>
                          <p>{order.shipping_address.address_line_1}</p>
                          {order.shipping_address.address_line_2 && <p>{order.shipping_address.address_line_2}</p>}
                          <p>{[order.shipping_address.postal_code, order.shipping_address.city].filter(Boolean).join(' ')}</p>
                          <p>{order.shipping_address.country || 'Tunisie (TN)'}</p>
                          {order.shipping_address.phone && (
                            <p className="font-mono text-gray-800 font-bold mt-1">📞 {order.shipping_address.phone}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs font-semibold text-gray-500">{t('dashboardPages.orders.noAddressRequired')}.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  TAB 2: ARTICLES & MODIFICATION (ITEMS & EDITING ENGINE)
                 ───────────────────────────────────────────────────────────── */}
              {activeTab === 'items' && (() => {
                const items = order.items || [];

                return (
                  <div className="space-y-5">
                    {/* Notice */}
                    <div className={`p-4 rounded-2xl border text-xs font-medium ${
                      isEditable ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-gray-100 border-gray-200 text-gray-700'
                    }`}>
                      {isEditable ? (
                        <div className="flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-bold">{t('dashboardPages.orders.drawerEditActive')}</p>
                            <p className="mt-0.5">
                              {t('dashboardPages.orders.drawerEditHint')}
                              {order.payment_status === 'captured' && (
                                <strong className="block mt-1 text-blue-950 font-bold">
                                  {t('dashboardPages.orders.drawerCapturedEditNotice')}
                                </strong>
                              )}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="font-bold text-gray-600">
                          🔒 Cette commande ne peut plus être modifiée car elle est déjà {order.fulfillment_status === 'shipped' ? 'expédiée' : order.fulfillment_status === 'delivered' ? 'livrée' : 'clôturée'}.
                        </p>
                      )}
                    </div>

                    {/* Top bar with Add Item button */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-gray-900">Articles de votre boutique ({items.length})</h3>
                      {isEditable && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddProductModal(true);
                            fetchStoreProductsForPicker();
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-black text-white hover:bg-emerald-700 transition shadow-xs"
                        >
                          <Plus className="w-4 h-4" />
                          Ajouter un article
                        </button>
                      )}
                    </div>

                    {/* Items List */}
                    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100 shadow-xs">
                      {items.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                          <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p className="text-sm font-bold">Aucun article dans cette commande.</p>
                        </div>
                      ) : (
                        items.map((item) => {
                          const qty = toNumber(item.quantity) || 1;
                          const isEditingThis = editingItemId === item.id;

                          return (
                            <div key={item.id || `${item.product_id}-${item.variant_id}`} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 border border-gray-200">
                                  {item.thumbnail ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={getResizedImageUrl(item.thumbnail, 'large')} alt={item.product_title || ''} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-gray-400">
                                      <ShoppingBag className="w-5 h-5" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-extrabold text-gray-900 text-sm truncate">{item.product_title || 'Produit'}</p>
                                  <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-gray-500">
                                    <span className="font-semibold">{formatMoney(item.unit_price, order.currency || 'TND')} / unité</span>
                                    {item.variant_title && <span className="rounded bg-gray-100 px-1.5 py-0.5 font-bold text-gray-700">{item.variant_title}</span>}
                                    {item.variant_sku && <span className="font-mono text-[11px] text-gray-400">SKU: {item.variant_sku}</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-5">
                                {/* Inline Quantity Controls */}
                                {isEditable && item.id ? (
                                  <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 p-1">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateItemQuantity(item.id!, qty - 1)}
                                      disabled={isEditingThis || qty <= 1}
                                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 shadow-xs"
                                    >
                                      <Minus className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="w-8 text-center text-xs font-black text-gray-900 font-mono">
                                      {isEditingThis ? <Loader2 className="h-3 w-3 animate-spin mx-auto text-emerald-600" /> : qty}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateItemQuantity(item.id!, qty + 1)}
                                      disabled={isEditingThis}
                                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 shadow-xs"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs font-bold text-gray-700">Quantité : {qty}</span>
                                )}

                                {/* Subtotal */}
                                <div className="text-right min-w-[80px]">
                                  <p className="text-sm font-black text-gray-900">{formatMoney(item.subtotal, order.currency || 'TND')}</p>
                                </div>

                                {/* Delete Button */}
                                {isEditable && item.id && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOrderItem(item.id!)}
                                    disabled={isEditingThis}
                                    className="p-2 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 transition disabled:opacity-40"
                                    title="Supprimer cet article"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Totals Summary */}
                    <div className="rounded-2xl bg-gray-50 border border-gray-200/80 p-5 space-y-2 text-xs font-semibold text-gray-600">
                      <div className="flex justify-between">
                        <span>Sous-total articles :</span>
                        <span className="font-bold text-gray-900">{formatMoney(order.store_subtotal ?? order.subtotal, order.currency || 'TND')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Frais de livraison :</span>
                        <span className="font-bold text-gray-900">{formatMoney(order.store_shipping_total ?? order.shipping_total, order.currency || 'TND')}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-black text-gray-900">
                        <span>Total de votre boutique :</span>
                        <span className="text-emerald-600">{formatMoney(order.store_total ?? order.total, order.currency || 'TND')}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ─────────────────────────────────────────────────────────────
                  TAB 3: EXPÉDITION & TRANSPORTEUR (SHIPPING & CARRIER)
                 ───────────────────────────────────────────────────────────── */}
              {activeTab === 'shipping' && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b pb-3">
                      <Truck className="h-5 w-5 text-purple-600" />
                      <h3 className="text-sm font-black text-gray-900">{t('dashboardPages.orders.drawerShippingStatus')}</h3>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="p-3.5 rounded-xl bg-gray-50">
                        <span className="text-[11px] font-bold text-gray-400 uppercase">{t('dashboardPages.orders.carrier')}</span>
                        <p className="font-black text-gray-900 mt-1">{order.carrier || t('dashboardPages.orders.drawerNoCarrier')}</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-gray-50">
                        <span className="text-[11px] font-bold text-gray-400 uppercase">{t('dashboardPages.orders.drawerTrackingNumber')}</span>
                        <p className="font-mono font-bold text-gray-900 mt-1">{order.tracking_number || '—'}</p>
                      </div>
                    </div>

                    {order.tracking_number && getTrackingUrl(order.carrier, order.tracking_number) && (
                      <a
                        href={getTrackingUrl(order.carrier, order.tracking_number)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100"
                      >
                        <span>Consulter le suivi transporteur en direct ↗</span>
                      </a>
                    )}

                    {/* Shipment Action Buttons */}
                    <div className="grid gap-2.5 sm:grid-cols-2 pt-2">
                      {canGenerateShippingLabel(order) && (
                        <button
                          type="button"
                          onClick={() => void generateShippingLabel(order)}
                          disabled={generatingLabelId === order.id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
                        >
                          {generatingLabelId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ReceiptText className="h-4 w-4" />}
                          {latestShipment(order) ? t('dashboardPages.orders.openLabel') : t('dashboardPages.orders.generateLabel')}
                        </button>
                      )}

                      {canPrepare(order) && (
                        <button
                          type="button"
                          onClick={() => void startPreparation(order)}
                          disabled={preparingId === order.id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
                        >
                          {preparingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                          {t('dashboardPages.orders.startPreparation')}
                        </button>
                      )}

                      {canRevertPreparation(order) && (
                        <button
                          type="button"
                          onClick={() => void revertPreparation(order)}
                          disabled={preparingId === order.id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-black text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
                        >
                          {preparingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                          {t('dashboardPages.orders.revertPreparation')}
                        </button>
                      )}

                      {canFulfill(order) && (
                        <button
                          type="button"
                          onClick={() => openFulfillmentModal(order)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-xs font-black text-white transition hover:bg-purple-700 shadow-xs"
                        >
                          <Truck className="h-4 w-4" />
                          {t('dashboardPages.orders.markShipped')}
                        </button>
                      )}

                      {canMarkDelivered(order) && (
                        <button
                          type="button"
                          onClick={() => void markOrderDelivered(order)}
                          disabled={submittingDeliveryProofId === order.id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white transition hover:bg-emerald-700 disabled:opacity-60 shadow-xs"
                        >
                          {submittingDeliveryProofId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          {t('dashboardPages.orders.markDelivered')}
                        </button>
                      )}

                      {order.fulfillment_status === 'shipped' && setRtoOrderTarget && (
                        <button
                          type="button"
                          onClick={() => setRtoOrderTarget(order)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black text-rose-700 transition hover:bg-rose-100"
                        >
                          <RotateCcw className="h-4 w-4" />
                          <span>{t('dashboardPages.orders.reportRto')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  TAB 4: RADAR COD & PRÉ-VALIDATION (COD RISK & RADAR)
                 ───────────────────────────────────────────────────────────── */}
              {activeTab === 'cod' && order.payment_gateway === 'cod' && (() => {
                const phone = order.customer_phone || order.shipping_address?.phone || '';
                const cleanPhone = phone.replace(/\D+/g, '');
                const waPhone = cleanPhone.startsWith('216') ? cleanPhone : `216${cleanPhone}`;
                const waText = encodeURIComponent(`Bonjour ${customerName()}, nous confirmons votre commande PandaMarket #${order.id.slice(-8).toUpperCase()} de montant ${formatMoney(order.store_total || order.total)} pour livraison à ${order.shipping_address?.city || 'votre adresse'}. Confirmez-vous l'envoi ? Merci !`);

                const riskScore = order.cod_risk_score ?? (order.cod_status === 'otp_verified' || order.cod_status === 'confirmed' ? 0 : 35);
                const isHighRisk = riskScore > 60;
                const isModerateRisk = riskScore > 25 && riskScore <= 60;

                return (
                  <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-slate-900/5 p-6 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-amber-600" />
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                          {t('dashboardPages.orders.codDiagnosticTitle')}
                        </h3>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${
                        isHighRisk ? 'bg-red-100 text-red-800' : isModerateRisk ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isHighRisk ? t('dashboardPages.orders.riskHigh') : isModerateRisk ? t('dashboardPages.orders.riskModerate') : t('dashboardPages.orders.riskLow')} ({riskScore}%)
                      </span>
                    </div>

                    {/* Risk Factors Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-3 rounded-xl bg-white border border-slate-200">
                        <p className="font-bold text-slate-700">{t('dashboardPages.orders.codFactorPhone')}</p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{phone || t('dashboardPages.orders.phoneUnavailable')}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-slate-200">
                        <p className="font-bold text-slate-700">{t('dashboardPages.orders.codFactorAddress')}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">{order.shipping_address?.city || t('dashboardPages.orders.cityUnknown')}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-slate-200">
                        <p className="font-bold text-slate-700">{t('dashboardPages.orders.codFactorHistory')}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{t('dashboardPages.orders.codOrdersCount', { count: toNumber(order.customer_order_count) || 1 })}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-slate-200">
                        <p className="font-bold text-slate-700">{t('dashboardPages.orders.codFactorBasket')}</p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{formatMoney(order.store_total || order.total)}</p>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {phone && (
                        <a
                          href={`tel:${cleanPhone}`}
                          onClick={() => handleUpdateCodStatus('pending', 1, 'Tentative d’appel')}
                          className="flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-white border border-slate-200 text-xs font-black text-slate-800 hover:bg-slate-50 shadow-xs"
                        >
                          <PhoneCall className="w-4 h-4 text-emerald-600" />
                          <span>{t('dashboardPages.orders.callCustomer')}</span>
                        </a>
                      )}
                      {phone && (
                        <a
                          href={`https://wa.me/${waPhone}?text=${waText}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 shadow-xs"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>{t('dashboardPages.orders.whatsAppOneClick')}</span>
                        </a>
                      )}
                    </div>

                    {/* SMS OTP */}
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Code SMS OTP de confirmation :</span>
                        <button
                          type="button"
                          onClick={handleSendCodOtp}
                          disabled={sendingCodOtp}
                          className="text-xs font-black text-amber-600 hover:underline disabled:opacity-50"
                        >
                          {sendingCodOtp ? t('dashboardPages.orders.otpSending') : t('dashboardPages.orders.otpSend')}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={codOtpInput}
                          onChange={(e) => setCodOtpInput(e.target.value)}
                          placeholder={t('dashboardPages.orders.otpPlaceholder')}
                          className="flex-1 px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-slate-50 outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyCodOtp}
                          disabled={verifyingCodOtp || !codOtpInput.trim()}
                          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:opacity-90 disabled:opacity-40"
                        >
                          {verifyingCodOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Valider OTP'}
                        </button>
                      </div>
                    </div>

                    {codFeedback && (
                      <p className="text-xs font-bold text-amber-700">{codFeedback}</p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateCodStatus('confirmed', 0, 'Confirmé')}
                        disabled={updatingCodStatus}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 transition shadow-xs flex items-center justify-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        <span>{t('dashboardPages.orders.codConfirmForShipping')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateCodStatus('rejected', 0, 'Rejeté')}
                        disabled={updatingCodStatus}
                        className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition"
                      >
                        {t('dashboardPages.orders.refuse')}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* ─────────────────────────────────────────────────────────────
                  TAB 5: FACTURE & NOTES INTERNES (INVOICES & NOTES)
                 ───────────────────────────────────────────────────────────── */}
              {activeTab === 'notes' && (
                <div className="space-y-5">
                  {/* Note Editor */}
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <StickyNote className="h-4 w-4 text-amber-700" />
                        <h3 className="text-sm font-black text-amber-950">{t('dashboardPages.orders.sellerNoteTitle')}</h3>
                      </div>
                      {order.seller_note?.updated_at && (
                        <span className="text-[11px] font-bold text-amber-700">
                          {t('dashboardPages.orders.modifiedOn', { date: formatDateTime(order.seller_note.updated_at, locale) })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-amber-800/80">
                      {t('dashboardPages.orders.sellerNoteDesc')}
                    </p>
                    <textarea
                      value={sellerNote}
                      onChange={(event) => {
                        setSellerNote(event.target.value);
                        setNoteFeedback('');
                      }}
                      rows={4}
                      maxLength={5000}
                      placeholder={t('dashboardPages.orders.sellerNotePlaceholder')}
                      className="w-full resize-none rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:ring-2 focus:ring-amber-400"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-bold text-amber-700">{sellerNote.length}/5000</span>
                      {noteFeedback && <span className="text-xs font-black text-amber-700">{noteFeedback}</span>}
                      <button
                        type="button"
                        onClick={saveSellerNote}
                        disabled={savingNote}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white transition hover:bg-amber-700 disabled:opacity-60"
                      >
                        {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {t('dashboardPages.orders.saveNote')}
                      </button>
                    </div>
                  </div>

                  {/* Invoices & Chat CTAs */}
                  <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3 shadow-xs">
                    <h3 className="text-sm font-black text-gray-900">Facturation & Communication</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <a
                        href={`/api/pd/orders/store/${order.id}/invoice.pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white hover:bg-emerald-700 transition"
                      >
                        <FileText className="h-4 w-4" />
                        {t('dashboardPages.orders.drawerSellerInvoice')}
                      </a>
                      <button
                        type="button"
                        onClick={() => void startBuyerChat(order)}
                        disabled={startingChatId === order.id}
                        className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-black text-gray-800 hover:bg-gray-100 transition"
                      >
                        {startingChatId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                        {t('dashboardPages.orders.messageCustomer')}
                      </button>
                    </div>
                  </div>

                  {/* Refunds Section */}
                  <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-gray-900">{t('dashboardPages.orders.refunds')}</h3>
                      <button
                        type="button"
                        onClick={() => openRefundModal(order)}
                        disabled={!canRequestRefund(order)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-40"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        {t('dashboardPages.orders.requestRefund')}
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 text-xs">
                      <div className="p-3 rounded-xl bg-gray-50">
                        <span className="text-gray-500">{t('dashboardPages.orders.refundRequestedProcessed')}</span>
                        <p className="font-bold text-gray-900 mt-1">{formatMoney(refundRequestedTotal(order), order.currency || 'TND')}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50">
                        <span className="text-gray-500">{t('dashboardPages.orders.refundableRemaining')}</span>
                        <p className="font-bold text-gray-900 mt-1">{formatMoney(refundableRemaining(order), order.currency || 'TND')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PRODUCT PICKER MODAL (ADD PRODUCT TO ORDER)
         ───────────────────────────────────────────────────────────── */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-gray-900">{t('dashboardPages.orders.drawerAddProduct')}</h3>
                <p className="text-xs text-gray-500">Commande #{order.id.slice(-8).toUpperCase()}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddProductModal(false);
                  setSelectedProductToAdd(null);
                  setSelectedVariantToAdd(null);
                }}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher parmi vos produits..."
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-900 outline-none focus:border-emerald-500"
              />
            </div>

            {/* Product List */}
            <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-xl">
              {loadingProducts ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
                  <span className="text-xs text-gray-400 mt-2 block">Chargement de votre catalogue...</span>
                </div>
              ) : availableStoreProducts.filter((p) => !productSearchQuery || p.title.toLowerCase().includes(productSearchQuery.toLowerCase())).length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  {t('dashboardPages.orders.drawerNoProducts')}
                </div>
              ) : (
                availableStoreProducts
                  .filter((p) => !productSearchQuery || p.title.toLowerCase().includes(productSearchQuery.toLowerCase()))
                  .map((product) => {
                    const isSelected = selectedProductToAdd?.id === product.id;
                    return (
                      <div
                        key={product.id}
                        onClick={() => {
                          setSelectedProductToAdd(product);
                          setSelectedVariantToAdd(product.variants?.[0] || null);
                        }}
                        className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                          isSelected ? 'bg-emerald-50/80 border-l-4 border-emerald-600' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {product.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={getResizedImageUrl(product.thumbnail, 'thumbnail')} alt={product.title} className="h-10 w-10 rounded-lg object-cover border" />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                              <ShoppingBag className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-extrabold text-xs text-gray-900 truncate">{product.title}</p>
                            <p className="text-[11px] font-semibold text-gray-500">{formatMoney(product.price)} · Stock: {product.inventory_quantity ?? '—'}</p>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </div>
                    );
                  })
              )}
            </div>

            {/* Variant Selector if product has variants */}
            {selectedProductToAdd?.variants && selectedProductToAdd.variants.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Variante du produit :</label>
                <select
                  value={selectedVariantToAdd?.id || ''}
                  onChange={(e) => {
                    const v = selectedProductToAdd.variants.find((item: any) => item.id === e.target.value);
                    setSelectedVariantToAdd(v || null);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-800 outline-none"
                >
                  {selectedProductToAdd.variants.map((variant: any) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.title} — {formatMoney(variant.price)} (Stock: {variant.inventory_quantity ?? '—'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quantity Selector */}
            {selectedProductToAdd && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-gray-700">{t('dashboardPages.orders.drawerQuantityToAdd')}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAddItemQuantity((q) => Math.max(1, q - 1))}
                    className="h-8 w-8 rounded-lg border bg-white flex items-center justify-center text-gray-700"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-mono font-bold text-sm">{addItemQuantity}</span>
                  <button
                    type="button"
                    onClick={() => setAddItemQuantity((q) => q + 1)}
                    className="h-8 w-8 rounded-lg border bg-white flex items-center justify-center text-gray-700"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 rounded-xl hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!selectedProductToAdd || addingItemLoading}
                onClick={handleAddOrderItem}
                className="px-5 py-2 text-xs font-black text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
              >
                {addingItemLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Ajouter à la commande
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
