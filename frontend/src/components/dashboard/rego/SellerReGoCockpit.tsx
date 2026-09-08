'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Phone,
  ShieldCheck,
  Truck,
  AlertTriangle,
  ArrowRight,
  Clock,
  Sparkles,
  Search,
  ExternalLink,
  ChevronRight,
  Eye,
  CheckCircle2,
  Filter,
  Check,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoSplitCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
} from './ReGoPrimitives';
import { useLocale } from '@/contexts/LocaleContext';

interface OrderItem {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  governorate: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'returned';
  payment_method: 'COD' | 'ONLINE' | 'MANDAT';
  anti_refus_score?: 'safe' | 'warning' | 'critical';
  carrier?: string;
  created_at: string;
}

export function SellerReGoCockpit({
  storeName = 'Boutique Elyssa',
  totalSales = 8450.750,
  ordersCount = 142,
  conversionRate = 3.8,
  averageOrderValue = 59.500,
  recentOrders = [],
}: {
  storeName?: string;
  totalSales?: number;
  ordersCount?: number;
  conversionRate?: number;
  averageOrderValue?: number;
  recentOrders?: OrderItem[];
}) {
  const { t } = useLocale();
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [validatedCodIds, setValidatedCodIds] = useState<Record<string, boolean>>({});

  // Mock urgent COD orders if none provided
  const urgentCodOrders: OrderItem[] = [
    {
      id: 'cmd-901',
      order_number: '#CMD-2026-901',
      customer_name: 'Mohamed Ben Salah',
      customer_phone: '+216 98 450 120',
      governorate: 'Sfax',
      total_amount: 145.000,
      status: 'pending',
      payment_method: 'COD',
      anti_refus_score: 'warning',
      carrier: 'Runex',
      created_at: 'Il y a 18 min',
    },
    {
      id: 'cmd-902',
      order_number: '#CMD-2026-902',
      customer_name: 'Fatma Cherif',
      customer_phone: '+216 22 180 944',
      governorate: 'Ariana',
      total_amount: 88.500,
      status: 'pending',
      payment_method: 'COD',
      anti_refus_score: 'safe',
      carrier: 'Aramex Express',
      created_at: 'Il y a 35 min',
    },
    {
      id: 'cmd-903',
      order_number: '#CMD-2026-903',
      customer_name: 'Youssef Trabelsi',
      customer_phone: '+216 55 901 332',
      governorate: 'Sousse',
      total_amount: 210.000,
      status: 'pending',
      payment_method: 'COD',
      anti_refus_score: 'critical',
      carrier: 'Rapid-Poste',
      created_at: 'Il y a 52 min',
    },
  ];

  const handleValidateCod = (orderId: string) => {
    setValidatedCodIds((prev) => ({ ...prev, [orderId]: true }));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Store Status & Cockpit Pulse */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-gradient-to-r from-[var(--rego-surface,#f5f5f5)] via-[var(--rego-bg,#ffffff)] to-[var(--rego-surface,#f5f5f5)] p-4 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-[var(--rego-fg,#111111)]">{storeName}</h2>
              <ReGoStatusChip status="ok" label="Boutique Active" size="xs" />
            </div>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
              Cockpit ReGo · Synchronisation temps réel des expéditions et du Cash on Delivery
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/hub/dashboard/orders"
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-2xs transition-all"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
            <span>Toutes les Commandes</span>
          </Link>
          <Link
            href="/hub/dashboard/products/create"
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--rego-accent-deep,#8f0404)] shadow-xs transition-all"
          >
            <span>+ Ajouter un Produit</span>
          </Link>
        </div>
      </div>

      {/* Layer 4: Telemetry & KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <ReGoKpiHero
          label="Chiffre d'Affaires Brut"
          value={<ReGoAmtBox amount={totalSales} size="lg" />}
          delta={14.8}
          deltaType="increase"
          hint="Net encaissé & en cours de livraison"
        />
        <ReGoKpiHero
          label="Commandes Traitées"
          value={ordersCount}
          delta={8.2}
          deltaType="increase"
          hint="Dont 84% livrées avec succès"
        />
        <ReGoKpiHero
          label="Taux de Conversion"
          value={`${conversionRate}%`}
          delta={0.6}
          deltaType="increase"
          hint="Visiteurs uniques convertis en paniers"
        />
        <ReGoKpiHero
          label="Panier Moyen"
          value={<ReGoAmtBox amount={averageOrderValue} size="lg" />}
          delta={2.1}
          deltaType="increase"
          hint="Moyenne par commande validée"
        />
      </div>

      {/* High-Priority Commercial Decks: COD Anti-Refus Deck & 4-Carrier SLAs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Urgent COD Anti-Refus Verification Deck (7 cols) */}
        <div className="lg:col-span-7">
          <ReGoCard
            title="Validation Prioritaire COD (Anti-Refus)"
            subtitle="Validez les commandes Cash on Delivery avant le passage du livreur pour réduire les retours"
            icon={ShieldCheck}
            badge={<ReGoStatusChip status="warn" label="Action Requise" size="xs" />}
            actions={
              <Link href="/hub/dashboard/messages" className="text-xs font-bold text-[var(--rego-accent,#ad0505)] hover:underline">
                Ouvrir Chat Vendeur
              </Link>
            }
          >
            <div className="space-y-2.5">
              {urgentCodOrders.map((order) => {
                const isValidated = validatedCodIds[order.id];
                return (
                  <div
                    key={order.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/40 hover:bg-[var(--rego-surface,#f5f5f5)]/80 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[var(--rego-fg,#111111)]">
                          {order.order_number}
                        </span>
                        <span className="text-xs font-semibold text-[var(--rego-fg,#111111)]">
                          {order.customer_name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[var(--rego-ink-2,#737373)] font-medium">
                          {order.governorate}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--rego-ink-2,#737373)]">
                        <a
                          href={`tel:${order.customer_phone}`}
                          className="flex items-center gap-1 font-mono text-[11px] text-[var(--rego-accent,#ad0505)] hover:underline"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{order.customer_phone}</span>
                        </a>
                        <span>•</span>
                        <ReGoAmtBox amount={order.total_amount} size="sm" />
                        <span>•</span>
                        <span className="text-[10px] text-[var(--rego-ink-3,#949494)]">{order.created_at}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {order.anti_refus_score === 'safe' && (
                        <ReGoStatusChip status="ok" label="Risque Faible" size="xs" />
                      )}
                      {order.anti_refus_score === 'warning' && (
                        <ReGoStatusChip status="warn" label="Risque Moyen" size="xs" />
                      )}
                      {order.anti_refus_score === 'critical' && (
                        <ReGoStatusChip status="err" label="Risque Élevé" size="xs" />
                      )}

                      {isValidated ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 px-2.5 py-1 rounded bg-emerald-50">
                          <Check className="w-3.5 h-3.5" /> Confirmé
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleValidateCod(order.id)}
                          className="inline-flex items-center gap-1 text-xs font-bold bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] hover:bg-[var(--rego-accent,#ad0505)] px-3 py-1.5 rounded-[var(--rego-r,8px)] transition-all shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Valider 1-Clic</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ReGoCard>
        </div>

        {/* Tunisian 4-Carrier SLA Pipeline (5 cols) */}
        <div className="lg:col-span-5">
          <ReGoCard
            title="Pipeline Transporteurs Tunisiens"
            subtitle="Respect des délais d'acheminement et des collectes nationales"
            icon={Truck}
            actions={
              <Link href="/hub/dashboard/shipping" className="text-xs font-bold text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]">
                Configurer Tarifs
              </Link>
            }
          >
            <div className="space-y-2.5">
              {/* Aramex */}
              <div className="flex items-center justify-between p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div>
                    <span className="text-xs font-bold text-[var(--rego-fg,#111111)]">Aramex Express</span>
                    <p className="text-[10px] text-[var(--rego-ink-2,#737373)]">24h à 48h · 24 Gouvernorats</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-[var(--rego-fg,#111111)]">18 colis</span>
                  <p className="text-[10px] text-emerald-600 font-semibold">98.2% SLA</p>
                </div>
              </div>

              {/* Rapid-Poste */}
              <div className="flex items-center justify-between p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div>
                    <span className="text-xs font-bold text-[var(--rego-fg,#111111)]">Rapid-Poste (Poste Tunisienne)</span>
                    <p className="text-[10px] text-[var(--rego-ink-2,#737373)]">24h à 72h · Réseau National Postal</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-[var(--rego-fg,#111111)]">24 colis</span>
                  <p className="text-[10px] text-emerald-600 font-semibold">94.5% SLA</p>
                </div>
              </div>

              {/* Runex */}
              <div className="flex items-center justify-between p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <div>
                    <span className="text-xs font-bold text-[var(--rego-fg,#111111)]">Runex Delivery</span>
                    <p className="text-[10px] text-[var(--rego-ink-2,#737373)]">Sfax & Sud Tunisien Express</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-[var(--rego-fg,#111111)]">9 colis</span>
                  <p className="text-[10px] text-amber-600 font-semibold">89.0% SLA</p>
                </div>
              </div>

              {/* First Delivery */}
              <div className="flex items-center justify-between p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div>
                    <span className="text-xs font-bold text-[var(--rego-fg,#111111)]">First Delivery</span>
                    <p className="text-[10px] text-[var(--rego-ink-2,#737373)]">12h à 24h · Grand Tunis</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-[var(--rego-fg,#111111)]">14 colis</span>
                  <p className="text-[10px] text-emerald-600 font-semibold">99.1% SLA</p>
                </div>
              </div>
            </div>
          </ReGoCard>
        </div>
      </div>

      {/* Layer 6: Main Working Area - Recent Orders Stream */}
      <ReGoCard
        title="Dernières Commandes Marchand"
        subtitle="Flux en direct des ventes avec inspection détaillée"
        icon={Package}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/hub/dashboard/orders"
              className="text-xs font-bold text-[var(--rego-accent,#ad0505)] hover:underline inline-flex items-center gap-1"
            >
              <span>Voir tout le registre</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[var(--rego-fg,#111111)]">
            <thead className="border-b border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-[11px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">
              <tr>
                <th className="px-3 py-2.5">Commande</th>
                <th className="px-3 py-2.5">Client</th>
                <th className="px-3 py-2.5">Gouvernorat</th>
                <th className="px-3 py-2.5">Paiement</th>
                <th className="px-3 py-2.5">Montant</th>
                <th className="px-3 py-2.5">Statut</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--rego-border,#dedede)]/70">
              {urgentCodOrders.map((order) => (
                <tr key={order.id} className="hover:bg-[var(--rego-surface,#f5f5f5)]/50 transition-colors">
                  <td className="px-3 py-2.5 font-mono font-bold text-[var(--rego-accent,#ad0505)]">
                    {order.order_number}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-[var(--rego-fg,#111111)]">{order.customer_name}</div>
                    <div className="text-[10px] text-[var(--rego-ink-3,#949494)]">{order.customer_phone}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold">
                      {order.governorate}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                      Cash on Delivery
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <ReGoAmtBox amount={order.total_amount} size="sm" />
                  </td>
                  <td className="px-3 py-2.5">
                    <ReGoStatusChip
                      status={order.status === 'delivered' ? 'ok' : order.status === 'shipped' ? 'info' : 'warn'}
                      label={order.status === 'delivered' ? 'Livré' : order.status === 'shipped' ? 'En cours' : 'À valider'}
                      size="xs"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-accent,#ad0505)] p-1 rounded hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspecter</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReGoCard>

      {/* Layer 7: Detail Inspection Drawer */}
      <ReGoDrawer
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder?.order_number || 'Détails de la Commande'}
        subtitle={`Client: ${selectedOrder?.customer_name} · Gouvernorat de ${selectedOrder?.governorate}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)]"
            >
              Fermer
            </button>
            <Link
              href={`/hub/dashboard/orders`}
              className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:bg-[var(--rego-accent-deep,#8f0404)] shadow-xs"
            >
              Gérer la Commande
            </Link>
          </>
        }
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] p-3 bg-[var(--rego-surface,#f5f5f5)]/50">
              <span className="text-[10px] font-extrabold uppercase text-[var(--rego-ink-3,#949494)]">Montant Total à Encaisser</span>
              <div className="mt-1">
                <ReGoAmtBox amount={selectedOrder.total_amount} size="lg" />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[var(--rego-fg,#111111)]">Coordonnées du Client</h4>
              <div className="text-xs space-y-1 text-[var(--rego-ink-2,#737373)]">
                <p><strong className="text-[var(--rego-fg,#111111)]">Nom:</strong> {selectedOrder.customer_name}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Téléphone:</strong> {selectedOrder.customer_phone}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Gouvernorat:</strong> {selectedOrder.governorate}</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Mode de paiement:</strong> Cash on Delivery (COD)</p>
                <p><strong className="text-[var(--rego-fg,#111111)]">Transporteur assigné:</strong> {selectedOrder.carrier}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--rego-border,#dedede)]">
              <a
                href={`tel:${selectedOrder.customer_phone}`}
                className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-[var(--rego-r,8px)] bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-xs"
              >
                <Phone className="w-4 h-4" />
                <span>Appeler pour Confirmer l&apos;Adresse</span>
              </a>
            </div>
          </div>
        )}
      </ReGoDrawer>
    </div>
  );
}
