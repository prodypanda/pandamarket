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
  Copy,
} from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';
import { getResizedImageUrl } from '@/lib/image-url';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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
  const [removeItemTargetId, setRemoveItemTargetId] = useState<string | null>(null);
  const [removingItem, setRemovingItem] = useState(false);

  // COD State
  const [codOtpInput, setCodOtpInput] = useState('');
  const [sendingCodOtp, setSendingCodOtp] = useState(false);
  const [verifyingCodOtp, setVerifyingCodOtp] = useState(false);
  const [updatingCodStatus, setUpdatingCodStatus] = useState(false);
  const [codFeedback, setCodFeedback] = useState('');

  // Copy Feedback State
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    setSellerNote(order.seller_note?.body || '');
    setNoteFeedback('');
    setOrderEditFeedback(null);
  }, [order]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddProductModal) {
          setShowAddProductModal(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddProductModal, onClose]);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // fallback
    }
  };

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

  const handleRemoveOrderItem = (itemId: string) => {
    setRemoveItemTargetId(itemId);
  };

  const confirmRemoveOrderItem = async () => {
    if (!removeItemTargetId) return;
    const itemId = removeItemTargetId;
    setRemovingItem(true);
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
      setRemoveItemTargetId(null);
      await onOrderUpdated();
    } catch (err) {
      setOrderEditFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Erreur inconnue' });
    } finally {
      setEditingItemId(null);
      setRemovingItem(false);
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in" role="dialog" aria-modal="true">
        <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-xl flex flex-col border border-slate-100 dark:border-slate-800">
          {/* Header */}
          <div className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('dashboardPages.orders.orderDetails')}</h2>
                <button
                  type="button"
                  onClick={() => copyToClipboard(order.id, 'order_header_id')}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Copier l'ID de commande"
                >
                  <span>#{order.id.slice(-8).toUpperCase()}</span>
                  {copiedField === 'order_header_id' ? (
                    <span className="text-[10px] text-emerald-600 font-sans font-medium">Copié !</span>
                  ) : (
                    <Copy className="w-2.5 h-2.5 text-slate-400" />
                  )}
                </button>
                {order.fulfillment_status && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${fulfillmentColor(order.fulfillment_status)}`}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
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
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
                title="Télécharger la Facture Vendeur PDF"
              >
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                <span>Facture PDF</span>
              </a>
              <button
                type="button"
                onClick={() => printSelectedOrder('delivery_slip')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs"
              >
                <ReceiptText className="h-3.5 w-3.5 text-slate-500" />
                <span>{t('dashboardPages.orders.deliverySlip')}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* 5-Tab Navigation Bar */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 px-6 overflow-x-auto gap-1.5 py-2">
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
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-normal'
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
                <div className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs font-medium ${
                  orderEditFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60' : 'bg-rose-50 text-rose-800 border border-rose-200/60'
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
                    <div className="rounded-xl bg-slate-50/70 dark:bg-slate-800/40 p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.status')}</p>
                      {(() => {
                        const store = storeOrderStatus(order, t);
                        return (
                          <span className={`mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${store.color}`}>
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
                            {store.label}
                          </span>
                        );
                      })()}
                      <p className="mt-2 text-[10px] font-normal text-slate-400">
                        {t('dashboardPages.orders.marketplaceStatus')}: {statusLabel(order.status, t)}
                      </p>
                      {toNumber(order.other_pending_stores) > 0 && (
                        <p className="mt-1 text-[10px] font-normal text-amber-700 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-lg border border-amber-200/60">
                          {t('dashboardPages.orders.waitingOtherStores', { count: toNumber(order.other_pending_stores) })}
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl bg-slate-50/70 dark:bg-slate-800/40 p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.paymentStatus')}</p>
                      <span className={`mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${paymentStatusColor(order.payment_status)}`}>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
                        {paymentStatusLabel(order.payment_status, t)}
                      </span>
                      <p className="mt-2 text-xs font-normal text-slate-600 dark:text-slate-300 capitalize">
                        Mode : {order.payment_gateway?.replace('_', ' ') || '—'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50/70 dark:bg-slate-800/40 p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.fulfillment')}</p>
                      <span className={`mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${fulfillmentColor(order.fulfillment_status)}`}>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
                        {fulfillmentLabel(order.fulfillment_status, t)}
                      </span>
                      <p className="mt-2 text-xs font-normal text-slate-600 dark:text-slate-300">
                        {order.carrier ? `Transporteur : ${order.carrier}` : 'Non assigné'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50/70 dark:bg-slate-800/40 p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.yourTotal')}</p>
                      <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">{formatMoney(order.store_total ?? order.total, order.currency || 'TND')}</p>
                      <p className="mt-1 text-[11px] font-normal text-slate-400">
                        Dont livraison : {formatMoney(order.store_shipping_total ?? order.shipping_total, order.currency || 'TND')}
                      </p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">{t('dashboardPages.orders.orderTimeline')}</h3>
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {t('dashboardPages.orders.timelineProgress', { done: buildOrderTimeline(order, t).filter((step) => step.state === 'done').length, total: buildOrderTimeline(order, t).length })}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {buildOrderTimeline(order, t).map((step, index, steps) => (
                        <div key={`${step.label}-${index}`} className="relative flex gap-3">
                          {index < steps.length - 1 && <div className="absolute left-[14px] top-7 h-full w-px bg-slate-200 dark:bg-slate-700" />}
                          <div className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                            step.state === 'done'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : step.state === 'current'
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-slate-50 text-slate-400'
                          }`}>
                            {step.state === 'done' ? <Check className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                          </div>
                          <div className="min-w-0 flex-1 pb-3">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white">{step.label}</p>
                            <p className="text-[11px] font-normal text-slate-400">{step.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Customer & Address grid */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
                      <div className="flex items-center gap-2 mb-3">
                        <Mail className="h-4 w-4 text-slate-500" />
                        <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">{t('dashboardPages.orders.customer')}</h3>
                      </div>
                      <div className="space-y-2 text-xs">
                        <p className="font-semibold text-slate-900 dark:text-white text-sm">{customerName()}</p>
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1.5 font-normal">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            {order.customer_email || t('dashboardPages.orders.emailUnavailable')}
                          </span>
                          {order.customer_email && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(order.customer_email!, 'email')}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
                              title="Copier l'email"
                            >
                              {copiedField === 'email' ? <span className="text-[10px] text-emerald-600 font-medium">Copié !</span> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1.5 font-mono">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {order.customer_phone || t('dashboardPages.orders.phoneUnavailable')}
                          </span>
                          {order.customer_phone && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(order.customer_phone!, 'phone')}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
                              title="Copier le numéro"
                            >
                              {copiedField === 'phone' ? <span className="text-[10px] text-emerald-600 font-medium">Copié !</span> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2.5">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.orders')}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-white">{toNumber(order.customer_order_count)}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2.5">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">LTV</p>
                            <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-white">{formatMoney(order.customer_lifetime_value ?? 0, order.currency || 'TND')}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2.5">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.lastOrder')}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-white">{formatDateTime(order.customer_last_order_at, locale)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-4 w-4 text-slate-500" />
                        <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">{t('dashboardPages.orders.deliveryAddress')}</h3>
                      </div>
                      {order.shipping_address ? (
                        <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 font-normal">
                          <p className="font-semibold text-slate-900 dark:text-white text-sm">
                            {[order.shipping_address.first_name, order.shipping_address.last_name].filter(Boolean).join(' ')}
                          </p>
                          <p>{order.shipping_address.address_line_1}</p>
                          {order.shipping_address.address_line_2 && <p>{order.shipping_address.address_line_2}</p>}
                          <p>{[order.shipping_address.postal_code, order.shipping_address.city].filter(Boolean).join(' ')}</p>
                          <p className="text-slate-400">{order.shipping_address.country || 'Tunisie (TN)'}</p>
                          {order.shipping_address.phone && (
                            <div className="flex items-center justify-between font-mono font-medium text-slate-800 dark:text-slate-200 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                              <span>📞 {order.shipping_address.phone}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(order.shipping_address!.phone!, 'shipping_phone')}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition-colors"
                              >
                                {copiedField === 'shipping_phone' ? <span className="text-[10px] text-emerald-600 font-medium">Copié !</span> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          )}
                          {(order.shipping_address.city || order.shipping_address.address_line_1) && (
                            <div className="pt-2">
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([order.shipping_address.address_line_1, order.shipping_address.city, order.shipping_address.country || 'Tunisie'].filter(Boolean).join(', '))}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                              >
                                <span>Ouvrir sur Google Maps</span>
                                <ExternalLink className="w-3 h-3 text-slate-400" />
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 font-normal">{t('dashboardPages.orders.noAddressRequired')}.</p>
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
                    <div className={`p-3.5 rounded-xl border text-xs font-normal ${
                      isEditable ? 'bg-sky-50/60 border-sky-200/70 text-sky-900' : 'bg-slate-50 border-slate-200/80 text-slate-600'
                    }`}>
                      {isEditable ? (
                        <div className="flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-semibold">{t('dashboardPages.orders.drawerEditActive')}</p>
                            <p className="mt-0.5 text-sky-800">
                              {t('dashboardPages.orders.drawerEditHint')}
                              {order.payment_status === 'captured' && (
                                <strong className="block mt-1 text-sky-950 font-semibold">
                                  {t('dashboardPages.orders.drawerCapturedEditNotice')}
                                </strong>
                              )}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="font-medium text-slate-600">
                          🔒 Cette commande ne peut plus être modifiée car elle est déjà {order.fulfillment_status === 'shipped' ? 'expédiée' : order.fulfillment_status === 'delivered' ? 'livrée' : 'clôturée'}.
                        </p>
                      )}
                    </div>

                    {/* Top bar with Add Item button */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Articles de votre boutique ({items.length})</h3>
                      {isEditable && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddProductModal(true);
                            fetchStoreProductsForPicker();
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Ajouter un article
                        </button>
                      )}
                    </div>

                    {/* Items List */}
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-2xs">
                      {items.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                          <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p className="text-xs font-medium">Aucun article dans cette commande.</p>
                        </div>
                      ) : (
                        items.map((item) => {
                          const qty = toNumber(item.quantity) || 1;
                          const isEditingThis = editingItemId === item.id;

                          return (
                            <div key={item.id || `${item.product_id}-${item.variant_id}`} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                                  {item.thumbnail ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={getResizedImageUrl(item.thumbnail, 'large')} alt={item.product_title || ''} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-slate-400">
                                      <ShoppingBag className="w-4 h-4" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-900 dark:text-white text-xs truncate">{item.product_title || 'Produit'}</p>
                                  <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500">
                                    <span className="font-normal">{formatMoney(item.unit_price, order.currency || 'TND')} / unité</span>
                                    {item.variant_title && <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">{item.variant_title}</span>}
                                    {item.variant_sku && <span className="font-mono text-[10px] text-slate-400">SKU: {item.variant_sku}</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-5">
                                {/* Inline Quantity Controls */}
                                {isEditable && item.id ? (
                                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateItemQuantity(item.id!, qty - 1)}
                                      disabled={isEditingThis || qty <= 1}
                                      className="flex h-6 w-6 items-center justify-center rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-40 shadow-2xs"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </button>
                                    <span className="w-7 text-center text-xs font-semibold text-slate-900 dark:text-white font-mono">
                                      {isEditingThis ? <Loader2 className="h-3 w-3 animate-spin mx-auto text-slate-600" /> : qty}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateItemQuantity(item.id!, qty + 1)}
                                      disabled={isEditingThis}
                                      className="flex h-6 w-6 items-center justify-center rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-40 shadow-2xs"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs font-normal text-slate-600 dark:text-slate-400">Qté : <strong className="font-semibold text-slate-900 dark:text-white">{qty}</strong></span>
                                )}

                                {/* Subtotal */}
                                <div className="text-right min-w-[70px]">
                                  <p className="text-xs font-semibold text-slate-900 dark:text-white">{formatMoney(item.subtotal, order.currency || 'TND')}</p>
                                </div>

                                {/* Delete Button */}
                                {isEditable && item.id && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOrderItem(item.id!)}
                                    disabled={isEditingThis}
                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition disabled:opacity-40"
                                    title="Supprimer cet article"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Totals Summary */}
                    <div className="rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-4 space-y-1.5 text-xs font-normal text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between">
                        <span>Sous-total articles :</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{formatMoney(order.store_subtotal ?? order.subtotal, order.currency || 'TND')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Frais de livraison :</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{formatMoney(order.store_shipping_total ?? order.shipping_total, order.currency || 'TND')}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 text-xs font-semibold text-slate-900 dark:text-white">
                        <span>Total de votre boutique :</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{formatMoney(order.store_total ?? order.total, order.currency || 'TND')}</span>
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
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <Truck className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">{t('dashboardPages.orders.drawerShippingStatus')}</h3>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{t('dashboardPages.orders.carrier')}</span>
                        <p className="font-semibold text-slate-900 dark:text-white mt-1 text-xs">{order.carrier || t('dashboardPages.orders.drawerNoCarrier')}</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{t('dashboardPages.orders.drawerTrackingNumber')}</span>
                          {order.tracking_number && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(order.tracking_number!, 'tracking_drawer')}
                              className="p-0.5 text-slate-400 hover:text-slate-700 transition-colors"
                              title="Copier le numéro de suivi"
                            >
                              {copiedField === 'tracking_drawer' ? <span className="text-[10px] text-emerald-600 font-medium">Copié !</span> : <Copy className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                        <p className="font-mono font-semibold text-slate-900 dark:text-white mt-1 text-xs">{order.tracking_number || '—'}</p>
                      </div>
                    </div>

                    {order.tracking_number && getTrackingUrl(order.carrier, order.tracking_number) && (
                      <a
                        href={getTrackingUrl(order.carrier, order.tracking_number)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors shadow-2xs"
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
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 disabled:opacity-60 shadow-2xs"
                        >
                          {generatingLabelId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ReceiptText className="h-3.5 w-3.5 text-slate-500" />}
                          {latestShipment(order) ? t('dashboardPages.orders.openLabel') : t('dashboardPages.orders.generateLabel')}
                        </button>
                      )}

                      {canPrepare(order) && (
                        <button
                          type="button"
                          onClick={() => void startPreparation(order)}
                          disabled={preparingId === order.id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 disabled:opacity-60 shadow-2xs"
                        >
                          {preparingId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5 text-slate-500" />}
                          {t('dashboardPages.orders.startPreparation')}
                        </button>
                      )}

                      {canRevertPreparation(order) && (
                        <button
                          type="button"
                          onClick={() => void revertPreparation(order)}
                          disabled={preparingId === order.id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 disabled:opacity-60 shadow-2xs"
                        >
                          {preparingId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5 text-slate-400" />}
                          {t('dashboardPages.orders.revertPreparation')}
                        </button>
                      )}

                      {canFulfill(order) && (
                        <button
                          type="button"
                          onClick={() => openFulfillmentModal(order)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-white px-4 py-2.5 text-xs font-medium text-white dark:text-slate-900 transition hover:bg-slate-800 shadow-2xs"
                        >
                          <Truck className="h-3.5 w-3.5" />
                          {t('dashboardPages.orders.markShipped')}
                        </button>
                      )}

                      {canMarkDelivered(order) && (
                        <button
                          type="button"
                          onClick={() => void markOrderDelivered(order)}
                          disabled={submittingDeliveryProofId === order.id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-medium text-white transition hover:bg-emerald-800 disabled:opacity-60 shadow-2xs"
                        >
                          {submittingDeliveryProofId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          {t('dashboardPages.orders.markDelivered')}
                        </button>
                      )}

                      {order.fulfillment_status === 'shipped' && setRtoOrderTarget && (
                        <button
                          type="button"
                          onClick={() => setRtoOrderTarget(order)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200/70 bg-rose-50/60 px-4 py-2.5 text-xs font-medium text-rose-800 transition hover:bg-rose-100/80 shadow-2xs"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
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
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                        <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                          {t('dashboardPages.orders.codDiagnosticTitle')}
                        </h3>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        isHighRisk
                          ? 'bg-rose-50 text-rose-800 border-rose-200/60'
                          : isModerateRisk
                          ? 'bg-amber-50 text-amber-800 border-amber-200/60'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                      }`}>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
                        {isHighRisk ? t('dashboardPages.orders.riskHigh') : isModerateRisk ? t('dashboardPages.orders.riskModerate') : t('dashboardPages.orders.riskLow')} ({riskScore}%)
                      </span>
                    </div>

                    {/* Risk Factors Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.codFactorPhone')}</p>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono mt-1">{phone || t('dashboardPages.orders.phoneUnavailable')}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.codFactorAddress')}</p>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 truncate">{order.shipping_address?.city || t('dashboardPages.orders.cityUnknown')}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.codFactorHistory')}</p>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">{t('dashboardPages.orders.codOrdersCount', { count: toNumber(order.customer_order_count) || 1 })}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.codFactorBasket')}</p>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono mt-1">{formatMoney(order.store_total || order.total)}</p>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {phone && (
                        <a
                          href={`tel:${cleanPhone}`}
                          onClick={() => handleUpdateCodStatus('pending', 1, 'Tentative d’appel')}
                          className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 transition shadow-2xs"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                          <span>{t('dashboardPages.orders.callCustomer')}</span>
                        </a>
                      )}
                      {phone && (
                        <a
                          href={`https://wa.me/${waPhone}?text=${waText}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-emerald-700 text-white text-xs font-medium hover:bg-emerald-800 transition shadow-2xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{t('dashboardPages.orders.whatsAppOneClick')}</span>
                        </a>
                      )}
                    </div>

                    {/* SMS OTP */}
                    <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Code SMS OTP de confirmation :</span>
                        <button
                          type="button"
                          onClick={handleSendCodOtp}
                          disabled={sendingCodOtp}
                          className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 underline disabled:opacity-50"
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
                          className="flex-1 px-3 py-1.5 text-xs font-mono font-normal rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-slate-400 shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyCodOtp}
                          disabled={verifyingCodOtp || !codOtpInput.trim()}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium hover:bg-slate-800 disabled:opacity-40 shadow-2xs"
                        >
                          {verifyingCodOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Valider OTP'}
                        </button>
                      </div>
                    </div>

                    {codFeedback && (
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400">{codFeedback}</p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateCodStatus('confirmed', 0, 'Confirmé')}
                        disabled={updatingCodStatus}
                        className="flex-1 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium hover:bg-slate-800 transition shadow-2xs flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{t('dashboardPages.orders.codConfirmForShipping')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateCodStatus('rejected', 0, 'Rejeté')}
                        disabled={updatingCodStatus}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-600 text-xs font-medium transition shadow-2xs"
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
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 shadow-2xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <StickyNote className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">{t('dashboardPages.orders.sellerNoteTitle')}</h3>
                      </div>
                      {order.seller_note?.updated_at && (
                        <span className="text-[11px] font-normal text-slate-400">
                          {t('dashboardPages.orders.modifiedOn', { date: formatDateTime(order.seller_note.updated_at, locale) })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-normal text-slate-500">
                      {t('dashboardPages.orders.sellerNoteDesc')}
                    </p>
                    <textarea
                      value={sellerNote}
                      onChange={(event) => {
                        setSellerNote(event.target.value);
                        setNoteFeedback('');
                      }}
                      rows={3}
                      maxLength={5000}
                      placeholder={t('dashboardPages.orders.sellerNotePlaceholder')}
                      className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-normal text-slate-900 dark:text-white outline-none transition focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-2xs"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-normal text-slate-400">{sellerNote.length}/5000</span>
                      {noteFeedback && <span className="text-xs font-medium text-emerald-600">{noteFeedback}</span>}
                      <button
                        type="button"
                        onClick={saveSellerNote}
                        disabled={savingNote}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-3.5 py-2 text-xs font-medium text-white dark:text-slate-900 transition hover:bg-slate-800 disabled:opacity-60 shadow-2xs"
                      >
                        {savingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        {t('dashboardPages.orders.saveNote')}
                      </button>
                    </div>
                  </div>

                  {/* Invoices & Chat CTAs */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 shadow-2xs">
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Facturation & Communication</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <a
                        href={`/api/pd/orders/store/${order.id}/invoice.pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-white px-4 py-2.5 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 transition shadow-2xs"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {t('dashboardPages.orders.drawerSellerInvoice')}
                      </a>
                      <button
                        type="button"
                        onClick={() => void startBuyerChat(order)}
                        disabled={startingChatId === order.id}
                        className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition shadow-2xs"
                      >
                        {startingChatId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5 text-slate-400" />}
                        {t('dashboardPages.orders.messageCustomer')}
                      </button>
                    </div>
                  </div>

                  {/* Refunds Section */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">{t('dashboardPages.orders.refunds')}</h3>
                      <button
                        type="button"
                        onClick={() => openRefundModal(order)}
                        disabled={!canRequestRefund(order)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 disabled:opacity-40 shadow-2xs"
                      >
                        <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                        {t('dashboardPages.orders.requestRefund')}
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.refundRequestedProcessed')}</span>
                        <p className="font-semibold text-slate-900 dark:text-white mt-1 font-mono">{formatMoney(refundRequestedTotal(order), order.currency || 'TND')}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('dashboardPages.orders.refundableRemaining')}</span>
                        <p className="font-semibold text-slate-900 dark:text-white mt-1 font-mono">{formatMoney(refundableRemaining(order), order.currency || 'TND')}</p>
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
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t('dashboardPages.orders.drawerAddProduct')}</h3>
                <p className="mt-0.5 inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">#{order.id.slice(-8).toUpperCase()}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddProductModal(false);
                  setSelectedProductToAdd(null);
                  setSelectedVariantToAdd(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher parmi vos produits..."
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-normal text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-2xs"
              />
            </div>

            {/* Product List */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl">
              {loadingProducts ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-600 mx-auto" />
                  <span className="text-xs text-slate-400 mt-2 block">Chargement de votre catalogue...</span>
                </div>
              ) : availableStoreProducts.filter((p) => !productSearchQuery || p.title.toLowerCase().includes(productSearchQuery.toLowerCase())).length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
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
                          isSelected ? 'bg-slate-100/80 dark:bg-slate-800/80' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {product.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={getResizedImageUrl(product.thumbnail, 'thumbnail')} alt={product.title} className="h-10 w-10 rounded-lg object-cover border border-slate-200/80 dark:border-slate-700" />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                              <ShoppingBag className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">{product.title}</p>
                            <p className="text-[11px] font-normal text-slate-500">{formatMoney(product.price)} · Stock: {product.inventory_quantity ?? '—'}</p>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-slate-900 dark:text-white shrink-0" />}
                      </div>
                    );
                  })
              )}
            </div>

            {/* Variant Selector if product has variants */}
            {selectedProductToAdd?.variants && selectedProductToAdd.variants.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Variante du produit :</label>
                <select
                  value={selectedVariantToAdd?.id || ''}
                  onChange={(e) => {
                    const v = selectedProductToAdd.variants.find((item: any) => item.id === e.target.value);
                    setSelectedVariantToAdd(v || null);
                  }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-normal text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400 shadow-2xs"
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
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{t('dashboardPages.orders.drawerQuantityToAdd')}</span>
                <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
                  <button
                    type="button"
                    onClick={() => setAddItemQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 shadow-2xs"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center font-mono font-semibold text-xs text-slate-900 dark:text-white">{addItemQuantity}</span>
                  <button
                    type="button"
                    onClick={() => setAddItemQuantity((q) => q + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 shadow-2xs"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-50 transition shadow-2xs"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!selectedProductToAdd || addingItemLoading}
                onClick={handleAddOrderItem}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white dark:text-slate-900 bg-slate-900 dark:bg-white rounded-xl hover:bg-slate-800 disabled:opacity-50 transition shadow-2xs"
              >
                {addingItemLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Ajouter à la commande
              </button>
            </div>
          </div>
        </div>
      )}

      {removeItemTargetId && (
        <ConfirmDialog
          isOpen={!!removeItemTargetId}
          onClose={() => {
            if (!removingItem) setRemoveItemTargetId(null);
          }}
          onConfirm={confirmRemoveOrderItem}
          title={t?.('dashboardPages.orders.removeItemTitle') || 'Retirer l’article'}
          description={t?.('dashboardPages.orders.confirmRemoveItem') || 'Êtes-vous sûr de vouloir retirer cet article de la commande ?'}
          confirmLabel={t?.('dashboardPages.orders.removeItemConfirm') || 'Retirer'}
          cancelLabel={t?.('dashboardPages.common.cancel') || 'Annuler'}
          variant="danger"
          loading={removingItem}
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
        />
      )}
    </>
  );
}
