'use client';

import React, { useState } from 'react';
import {
  Webhook,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  Send,
  Lock,
  Code2,
  Info,
  ShieldCheck,
  Copy,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoStatusChip,
} from '@/components/dashboard/rego/ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  consecutive_failures: number;
  last_delivery_at: string | null;
  last_status_code: number | null;
  created_at: string;
}

export interface DeliveryLog {
  id: string;
  event_type: string;
  status_code: number | null;
  error: string | null;
  attempt: number;
  delivered_at: string;
}

export const AVAILABLE_WEBHOOK_EVENTS = [
  { value: 'pd.order.placed', label: 'Nouvelle Commande Passée', desc: 'Déclenché dès quun acheteur finalise une commande (COD ou en ligne)' },
  { value: 'pd.order.fulfilled', label: 'Commande Expédiée', desc: 'Déclenché lors de la remise au transporteur (bordereau scanné)' },
  { value: 'pd.order.cancelled', label: 'Commande Annulée', desc: 'Déclenché si la commande est annulée ou le colis refusé' },
  { value: 'pd.payment.captured', label: 'Paiement Reçu / Encaissé', desc: 'Déclenché après encaissement des fonds ou versement bancaire' },
  { value: 'pd.product.created', label: 'Produit Créé', desc: 'Déclenché lors de lajout dun nouvel article dans le catalogue' },
  { value: 'pd.product.published', label: 'Produit Publié en Ligne', desc: 'Déclenché lorsque le produit devient visible sur la boutique vitrine' },
  { value: 'pd.stock.low', label: 'Alerte Stock Bas', desc: 'Déclenché dès quun article passe sous le seuil critique dinventaire' },
];

export interface SellerReGoWebhooksProps {
  webhooks: WebhookSubscription[];
  deliveries: DeliveryLog[];
  loading: boolean;
  error: string | null;
  selectedWebhook: string | null;
  onSelectWebhook: (id: string | null) => void;
  showCreate: boolean;
  onShowCreateChange: (open: boolean) => void;
  newUrl: string;
  onNewUrlChange: (url: string) => void;
  newEvents: string[];
  onToggleEvent: (event: string) => void;
  creating: boolean;
  onCreate: () => Promise<void> | void;
  newSecret: string | null;
  onClearNewSecret: () => void;
  onToggleActive: (id: string, currentActive: boolean) => Promise<void> | void;
  deleteTargetId: string | null;
  onDeleteTargetIdChange: (id: string | null) => void;
  deleting: boolean;
  onConfirmDelete: () => Promise<void> | void;
  onRefresh: () => Promise<void> | void;
  dir?: 'ltr' | 'rtl';
}

export function SellerReGoWebhooks({
  webhooks,
  deliveries,
  loading,
  error,
  selectedWebhook,
  onSelectWebhook,
  showCreate,
  onShowCreateChange,
  newUrl,
  onNewUrlChange,
  newEvents,
  onToggleEvent,
  creating,
  onCreate,
  newSecret,
  onClearNewSecret,
  onToggleActive,
  deleteTargetId,
  onDeleteTargetIdChange,
  deleting,
  onConfirmDelete,
  onRefresh,
  dir = 'ltr',
}: SellerReGoWebhooksProps) {
  const [copiedSecret, setCopiedSecret] = useState(false);

  const activeCount = webhooks.filter((w) => w.is_active).length;
  const failingCount = webhooks.filter((w) => w.consecutive_failures > 0).length;
  const selectedHook = webhooks.find((w) => w.id === selectedWebhook);

  const handleCopySecret = async () => {
    if (newSecret) {
      await navigator.clipboard.writeText(newSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Espace Vendeur', href: '/hub/dashboard' },
        { label: 'Webhooks Temps-Réel' },
      ]}
      headerTitle="Abonnements Webhooks Temps-Réel"
      headerSubtitle="Recevez des notifications HTTP instantanées sur vos serveurs dès qu'un événement intervient sur votre boutique."
      headerIcon={Webhook}
      statusBadge={
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          ReGo EventBridge
        </span>
      }
      primaryAction={
        <button
          onClick={() => {
            onShowCreateChange(true);
            onClearNewSecret();
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Créer un Endpoint</span>
        </button>
      }
      secondaryAction={
        <button
          onClick={() => void onRefresh()}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      }
      mainContent={
        <div className="space-y-6" dir={dir}>
          {/* Secret Reveal Banner */}
          {newSecret && (
            <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-slate-900 dark:text-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5" />
                  <span>Clé secrète de signature Webhook (HMAC-SHA256)</span>
                </div>
                <button
                  onClick={onClearNewSecret}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold cursor-pointer"
                >
                  Fermer
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Utilisez ce secret pour valider l'en-tête HTTP <strong className="font-mono text-slate-800 dark:text-slate-200">X-PandaMarket-Signature</strong> sur votre serveur. Ce secret ne sera plus affiché.
              </p>
              <div className="flex items-center gap-2 p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl border border-slate-800">
                <span className="flex-1 select-all break-all">{newSecret}</span>
                <button
                  onClick={() => void handleCopySecret()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold text-xs rounded-lg transition shrink-0 cursor-pointer"
                >
                  {copiedSecret ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSecret ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Telemetry KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReGoKpiHero
              label="Endpoints Configurés"
              value={webhooks.length}
              hint="Adresses URLs réceptrices enregistrées"
              icon={Webhook}
              accent
            />
            <ReGoKpiHero
              label="Flux Actifs"
              value={activeCount}
              hint="Abonnements recevant les pings"
              icon={Activity}
            />
            <ReGoKpiHero
              label="Échecs Consécutifs"
              value={failingCount}
              hint="Serveurs en anomalie de réponse"
              icon={AlertTriangle}
            />
            <ReGoKpiHero
              label="Sécurité des Payloads"
              value="HMAC-SHA256"
              hint="Signature cryptographique garantie"
              icon={Lock}
            />
          </div>

          {/* Webhook Endpoints List */}
          <ReGoCard
            title="Vos Points de Terminaison (Endpoints)"
            subtitle="Adresses cibles notifiées automatiquement à chaque déclenchement d'événement."
            actions={
              <span className="text-xs font-bold text-slate-500">
                {webhooks.length} URL{webhooks.length > 1 ? 's' : ''}
              </span>
            }
          >
            {loading ? (
              <div className="py-12 flex justify-center items-center">
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
              </div>
            ) : webhooks.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Webhook className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Aucun endpoint webhook configuré
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Abonnez votre serveur aux événements PandaMarket pour automatiser la comptabilité, le fulfillment ou le réapprovisionnement.
                  </p>
                </div>
                <button
                  onClick={() => onShowCreateChange(true)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Configurer un Endpoint
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {webhooks.map((hook) => {
                  const isSelected = selectedWebhook === hook.id;
                  return (
                    <div
                      key={hook.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isSelected
                          ? 'border-slate-900 dark:border-white bg-slate-50/50 dark:bg-slate-850 shadow-xs'
                          : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white break-all">
                              {hook.url}
                            </span>
                            {hook.is_active ? (
                              <ReGoStatusChip status="ok" label="En écoute" />
                            ) : (
                              <ReGoStatusChip status="neutral" label="Désactivé" />
                            )}
                            {hook.consecutive_failures > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-[10px] border border-rose-200 dark:border-rose-900/50">
                                {hook.consecutive_failures} échec(s)
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1 items-center">
                            {hook.events.map((evt) => (
                              <span
                                key={evt}
                                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700"
                              >
                                {evt}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => onSelectWebhook(isSelected ? null : hook.id)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
                              isSelected
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {isSelected ? 'Masquer Logs' : 'Voir Logs'}
                          </button>

                          <button
                            onClick={() => void onToggleActive(hook.id, hook.is_active)}
                            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg transition cursor-pointer"
                            title={hook.is_active ? 'Désactiver l\'endpoint' : 'Activer l\'endpoint'}
                          >
                            {hook.is_active ? (
                              <ToggleRight className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-slate-400" />
                            )}
                          </button>

                          <button
                            onClick={() => onDeleteTargetIdChange(hook.id)}
                            className="p-2 text-rose-500 hover:text-rose-700 rounded-lg transition cursor-pointer"
                            title="Supprimer cet abonnement"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Delivery Status Sub-bar */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                        <span>
                          Dernier envoi :{' ' }
                          <strong className="text-slate-600 dark:text-slate-300 font-mono">
                            {hook.last_delivery_at
                              ? new Date(hook.last_delivery_at).toLocaleDateString('fr-TN', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Aucun'}
                          </strong>
                        </span>
                        {hook.last_status_code && (
                          <span
                            className={`font-mono font-bold ${
                              hook.last_status_code >= 200 && hook.last_status_code < 300
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-500'
                            }`}
                          >
                            HTTP {hook.last_status_code}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ReGoCard>

          {/* Delivery Logs Viewer (Shown when a webhook is selected) */}
          {selectedWebhook && (
            <ReGoCard
              title={`Historique des Livraisons HTTP (${selectedHook?.url || 'Endpoint'})`}
              subtitle="Pings récents envoyés avec le code statut de réponse et les éventuels messages d'erreur."
              actions={
                <button
                  onClick={() => onSelectWebhook(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Fermer
                </button>
              }
            >
              {deliveries.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Aucun log de livraison enregistré pour cet endpoint.
                </div>
              ) : (
                <div className="overflow-x-auto -mx-5 sm:mx-0">
                  <table className="w-full text-left text-xs font-medium">
                    <thead>
                      <tr className="border-b border-slate-200/80 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="pb-3 px-4">Événement</th>
                        <th className="pb-3 px-4">Tentative</th>
                        <th className="pb-3 px-4">Statut HTTP</th>
                        <th className="pb-3 px-4">Horodatage</th>
                        <th className="pb-3 px-4">Message / Erreur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {deliveries.map((d) => {
                        const isSuccess = d.status_code && d.status_code >= 200 && d.status_code < 300;
                        return (
                          <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                              {d.event_type}
                            </td>
                            <td className="py-3 px-4 text-slate-500">#{d.attempt}</td>
                            <td className="py-3 px-4 font-mono">
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                  isSuccess
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                }`}
                              >
                                {d.status_code ?? 'Timeout'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[11px]">
                              {new Date(d.delivered_at).toLocaleDateString('fr-TN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </td>
                            <td className="py-3 px-4 text-slate-500 max-w-xs truncate text-[11px]">
                              {d.error ? (
                                <span className="text-rose-600 font-mono">{d.error}</span>
                              ) : (
                                <span className="text-emerald-600 font-semibold">200 Delivered OK</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </ReGoCard>
          )}

          {/* Create Modal */}
          {showCreate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 space-y-5 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Webhook className="w-5 h-5 text-slate-900 dark:text-white" />
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">Ajouter un Endpoint Webhook</h3>
                  </div>
                  <button
                    onClick={() => onShowCreateChange(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      URL de Réception (HTTPS recommandé) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={newUrl}
                      onChange={(e) => onNewUrlChange(e.target.value)}
                      placeholder="https://votre-domaine.tn/api/webhooks/pandamarket"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium font-mono outline-none focus:border-slate-900 dark:focus:border-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Événements à Écouter <span className="text-rose-500">*</span>
                    </label>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {AVAILABLE_WEBHOOK_EVENTS.map((evt) => {
                        const checked = newEvents.includes(evt.value);
                        return (
                          <div
                            key={evt.value}
                            onClick={() => onToggleEvent(evt.value)}
                            className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                              checked
                                ? 'border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-800'
                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {}}
                              className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-0"
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                {evt.label}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400 block mb-0.5">
                                {evt.value}
                              </span>
                              <span className="text-[11px] text-slate-500 block leading-tight">
                                {evt.desc}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => onShowCreateChange(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => void onCreate()}
                    disabled={creating || !newUrl || newEvents.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Créer l'Abonnement</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Delete Dialog */}
          <ConfirmDialog
            isOpen={Boolean(deleteTargetId)}
            title="Supprimer cet endpoint Webhook ?"
            description="Votre serveur ne recevra plus aucun événement pour cet abonnement. Vous pourrez le recréer à tout moment."
            confirmLabel="Supprimer Définitivement"
            cancelLabel="Annuler"
            variant="danger"
            onConfirm={() => void onConfirmDelete()}
            onClose={() => onDeleteTargetIdChange(null)}
          />
        </div>
      }
    />
  );
}
